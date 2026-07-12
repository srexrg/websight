/**
 * Unit tests for the BUILT React wrapper entry (packages/tracker/dist/react.js,
 * `npm run build:pkg`) - the "use client" directive in the emitted file and the
 * <Analytics /> component booting the tracker on mount, StrictMode double-mount
 * safety, and the re-exported track() sharing state with the mounted tracker.
 *
 * dist/react.js imports "./index.js" relatively, so both entries share ONE
 * dist/index.js module instance (and its memoized api). The cache-busting query
 * on react.js does not bust index.js, so the first Analytics mount in this file
 * wins the module-level memo; every later init() delegates through the core's
 * __ws_loaded guard. Tests stay isolated the same way npm-entry.test.ts does:
 * each test uses its OWN site name, asserts only through events(site), and the
 * beforeEach deletes window.__ws_loaded / window.websight so pageviews keep
 * flowing on the delegating second-init path.
 */
// @vitest-environment jsdom
// @vitest-environment-options { "url": "https://example.com/" }
import path from "path";
import { pathToFileURL } from "url";
import { createElement, StrictMode, act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import type { WebsightApi, WebsightOptions } from "../../packages/tracker/src/core";

// React act() needs this flag set before any render; vitest does not set it.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type ReactEntry = {
  Analytics: (props: WebsightOptions) => null;
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

const DIST_PATH = path.join(process.cwd(), "packages/tracker/dist/react.js");
const DIST = pathToFileURL(DIST_PATH).href;
let importSeq = 0;

/** Fresh module instance per call: the query string defeats the ESM cache. */
async function loadEntry(): Promise<ReactEntry> {
  return (await import(/* @vite-ignore */ `${DIST}?v=${++importSeq}`)) as unknown as ReactEntry;
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

type WsGlobals = {
  __ws_loaded?: number;
  websight?: unknown;
  __ws?: unknown;
  __wsr?: unknown;
  __wsr_active?: number;
};

beforeEach(() => {
  // Reset the module registry so react.js (and, crucially, the dist/index.js it
  // imports relatively) is re-executed fresh per test. Without this the
  // module-level `api` memo inside index.js persists - only the first test's
  // init() would ever run createTracker, and later mounts for a new site would
  // return the first tracker instead of firing their own pageview.
  vi.resetModules();
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

describe("react entry", () => {
  it("dist/react.js starts with the use client directive", () => {
    const first = readFileSync(DIST_PATH, "utf8").split("\n")[0];
    expect(first).toBe('"use client";');
  });

  it("mounting <Analytics /> boots the tracker and sends the initial pageview", async () => {
    const mod = await loadEntry();
    const div = document.createElement("div");
    const root = createRoot(div);
    await act(async () => {
      root.render(createElement(mod.Analytics, { site: "t-react.example" }));
    });
    const evs = events("t-react.example");
    expect(evs).toHaveLength(1);
    expect(evs[0].name).toBe("pageview");
  });

  it("StrictMode double-mount does not double-count", async () => {
    const mod = await loadEntry();
    const div = document.createElement("div");
    const root = createRoot(div);
    await act(async () => {
      root.render(createElement(StrictMode, null, createElement(mod.Analytics, { site: "t-strict.example" })));
    });
    const evs = events("t-strict.example").filter((e) => e.name === "pageview");
    expect(evs).toHaveLength(1);
  });

  it("track re-exported from the react entry shares state with the mounted tracker", async () => {
    const mod = await loadEntry();
    const div = document.createElement("div");
    const root = createRoot(div);
    await act(async () => {
      root.render(createElement(mod.Analytics, { site: "t-shared.example" }));
    });
    // The initial pageview flushed on its own (first event), so shared-event
    // now sits in the 2s batch; two fillers reach the 3-event limit and force
    // the flush, same trick npm-entry.test.ts uses.
    mod.track("shared-event");
    mod.track("filler-1");
    mod.track("filler-2");
    const names = events("t-shared.example").map((e) => e.name);
    expect(names).toContain("pageview");
    expect(names).toContain("shared-event");
  });
});
