/**
 * Unit tests for the BUILT npm package entry (packages/tracker/dist/index.js,
 * `npm run build:pkg`) - init/track/identify, SSR safety, the pre-init queue,
 * double-init, option mapping, and dynamic chunk loading.
 *
 * These run against one shared jsdom window, and each init() leaves listeners
 * and history patches behind on it. Two rules keep tests isolated anyway:
 * every test uses its OWN site name and asserts through events(site), and the
 * dist module is imported with a cache-busting query so module state (the
 * memoized api) is fresh per import.
 */
// @vitest-environment jsdom
// @vitest-environment-options { "url": "https://example.com/" }
import path from "path";
import { pathToFileURL } from "url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WebsightApi, WebsightOptions } from "../../packages/tracker/src/core";

type NpmEntry = {
  init(options: WebsightOptions): WebsightApi;
  track(name: string, props?: Record<string, unknown>): void;
  identify(id?: string | null, traits?: Record<string, unknown>): void;
};

// Environment shim (not part of the designed tests): modern Node exposes a
// built-in `localStorage` global that requires --localstorage-file to be
// functional, and vitest's jsdom environment (whose KEYS allow-list predates
// that global) does not know to override it - so `localStorage.clear` etc.
// come back undefined for both this file and the dist module it imports
// (window === globalThis under vitest's jsdom environment, so there is no
// separate real window to fall back to). Swap in a minimal Storage-compatible
// polyfill only when the ambient localStorage is missing or non-functional.
if (typeof localStorage === "undefined" || typeof localStorage.clear !== "function") {
  const store = new Map<string, string>();
  const shim: Storage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => void store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
  Object.defineProperty(globalThis, "localStorage", { value: shim, configurable: true, writable: true });
}

const DIST = pathToFileURL(path.join(process.cwd(), "packages/tracker/dist/index.js")).href;
let importSeq = 0;

/** Fresh module instance per call: the query string defeats the ESM cache. */
async function loadEntry(): Promise<NpmEntry> {
  return (await import(/* @vite-ignore */ `${DIST}?v=${++importSeq}`)) as unknown as NpmEntry;
}

type Beacon = { url: string; body: string };
let beacons: Beacon[];

type Ev = {
  site: string;
  name?: string;
  url?: string;
  vid?: string;
  uid?: string;
  sdk?: string;
  props?: Record<string, unknown>;
};

/** All events for one site, across all beacons (single events and batches). */
const events = (site: string): Ev[] =>
  beacons
    .flatMap((b) => {
      const d = JSON.parse(b.body) as Ev | Ev[];
      return Array.isArray(d) ? d : [d];
    })
    .filter((e) => e.site === site);

// 100ms (spec called for 20ms): in this sandbox the replay chunk (162KB,
// bundles @rrweb/record) reliably takes ~25-30ms to cold-import, so 20ms
// undershoots it on every run. 100ms gives comfortable margin without
// changing what either lazy-chunk test asserts.
const tick = () => new Promise((r) => setTimeout(r, 100));

type WsGlobals = {
  __ws_loaded?: number;
  websight?: unknown;
  __ws?: unknown;
  __wsr?: unknown;
  __wsr_active?: number;
};

beforeEach(() => {
  const W = window as unknown as Window & WsGlobals;
  delete W.__ws_loaded;
  delete W.websight;
  delete W.__ws;
  delete W.__wsr;
  delete W.__wsr_active;
  localStorage.clear();
  history.replaceState({}, "", "/");
  beacons = [];
  (navigator as unknown as { sendBeacon: (url: string, body: string) => boolean }).sendBeacon = (
    url: string,
    body: string,
  ) => {
    beacons.push({ url, body: String(body) });
    return true;
  };
});

describe("init", () => {
  it("sends the initial pageview to the default host endpoint", async () => {
    const { init } = await loadEntry();
    init({ site: "t-default.example" });
    expect(beacons.at(-1)!.url).toBe("https://websight.srexrg.me/api/track");
    const evs = events("t-default.example");
    expect(evs).toHaveLength(1);
    expect(evs[0].name).toBe("pageview");
    expect(evs[0].url).toBe("/");
    expect(evs[0].sdk).toBe("js@2.0.0");
    expect(evs[0].vid).toBeUndefined(); // stateless default: no client identity
  });

  it("resolves the endpoint from host (trailing slash trimmed) and lets api override it", async () => {
    const a = await loadEntry();
    a.init({ site: "t-host.example", host: "https://self.example.com/" });
    expect(beacons.at(-1)!.url).toBe("https://self.example.com/api/track");

    delete (window as unknown as Window & WsGlobals).__ws_loaded;
    delete (window as unknown as Window & WsGlobals).websight;
    const b = await loadEntry();
    b.init({ site: "t-api.example", api: "https://collect.example.com/ingest" });
    expect(beacons.at(-1)!.url).toBe("https://collect.example.com/ingest");
  });

  it("is a no-op without a window (SSR)", async () => {
    const { init, track } = await loadEntry();
    vi.stubGlobal("window", undefined);
    try {
      const api = init({ site: "t-ssr.example" });
      expect(() => api.track("x")).not.toThrow();
      expect(() => track("y")).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
    expect(events("t-ssr.example")).toHaveLength(0);
  });

  it("returns the same api on a second init and ignores its options", async () => {
    const { init } = await loadEntry();
    const first = init({ site: "t-once.example" });
    const second = init({ site: "t-twice.example" });
    expect(Object.is(first, second)).toBe(true);
    expect(events("t-once.example")).toHaveLength(1);
    expect(events("t-twice.example")).toHaveLength(0);
  });
});

describe("pre-init queue", () => {
  it("queues track() before init() and replays it, then the pageview flows", async () => {
    const mod = await loadEntry();
    mod.track("early", { n: 1 });
    expect(beacons).toHaveLength(0); // nothing sent before init
    mod.init({ site: "t-queue.example" });
    // The drained queue event is the first send, so it flushes immediately.
    expect(events("t-queue.example")[0].name).toBe("early");
    expect(events("t-queue.example")[0].props).toEqual({ n: 1 });
    // The initial pageview is the second send: it sits in the 2s batch queue
    // until something forces a flush - two more events hit the 3-event limit.
    mod.track("a");
    mod.track("b");
    const names = events("t-queue.example").map((e) => e.name);
    expect(names).toContain("pageview");
    expect(names).toContain("a");
  });
});

describe("identify", () => {
  it("attaches uid in persistent mode and stores the visitor id", async () => {
    const mod = await loadEntry();
    mod.init({ site: "t-persist.example", mode: "persistent" });
    expect(localStorage.getItem("websight_vid")).toBeTruthy();
    mod.identify("user-9", { plan: "pro" });
    mod.track("after-identify");
    mod.track("filler"); // third send triggers the batch flush
    const ev = events("t-persist.example").find((e) => e.name === "after-identify")!;
    expect(ev.uid).toBe("user-9");
    expect(localStorage.getItem("websight_uid")).toBe("user-9");
  });

  it("is a no-op in stateless mode", async () => {
    const mod = await loadEntry();
    mod.init({ site: "t-stateless.example" });
    mod.identify("user-9"); // stateless: no-op, does not enqueue an event
    mod.track("x");
    mod.track("y");
    mod.track("z"); // third send triggers the batch flush (pageview + x + y + z)
    const ev = events("t-stateless.example").find((e) => e.name === "x")!;
    expect(ev.uid).toBeUndefined();
    expect(localStorage.getItem("websight_uid")).toBeNull();
  });
});

describe("lazy chunks", () => {
  it("loads the errors chunk via dynamic import and reports thrown errors", async () => {
    const mod = await loadEntry();
    mod.init({ site: "t-errors.example", errors: true });
    await tick(); // dynamic import resolves and startExtension registers listeners
    window.dispatchEvent(new ErrorEvent("error", { message: "boom", filename: "app.js", lineno: 3 }));
    mod.track("f1");
    mod.track("f2"); // reach the 3-event flush
    const ev = events("t-errors.example").find((e) => e.name === "error")!;
    expect(ev).toBeTruthy();
    expect((ev.props as { message: string }).message).toBe("boom");
  });

  it("loads the replay chunk only when enabled and asks the server for config", async () => {
    // Explicit generic (not part of the design, just a type fix): without it
    // the zero-arg implementation makes TS infer mock.calls as [][], so
    // calls[0][0] below can't type-check even though it's a runtime no-op.
    const fetchSpy = vi.fn<(input: string) => Promise<{ json: () => Promise<{ on: boolean }> }>>(() =>
      Promise.resolve({ json: () => Promise.resolve({ on: false }) }),
    );
    vi.stubGlobal("fetch", fetchSpy);
    try {
      const off = await loadEntry();
      off.init({ site: "t-noreplay.example" });
      await tick();
      expect(fetchSpy).not.toHaveBeenCalled();

      delete (window as unknown as Window & WsGlobals).__ws_loaded;
      delete (window as unknown as Window & WsGlobals).websight;
      const on = await loadEntry();
      on.init({ site: "t-replay.example", replay: true });
      await tick();
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const calledUrl = String(fetchSpy.mock.calls[0][0]);
      expect(calledUrl).toContain("https://websight.srexrg.me/api/replay");
      expect(calledUrl).toContain("site=t-replay.example");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
