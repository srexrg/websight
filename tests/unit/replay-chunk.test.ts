/**
 * Unit tests for the BUILT session-replay recorder chunk (public/t-r.js),
 * plus the core loader wiring in public/t.js, running in isolated jsdom
 * pages (docs/redesign/24). Covers the boot guard, server-driven config
 * gating, sampling, chunk shipping, and the gzipped size budgets.
 */
import { readFileSync } from "fs";
import path from "path";
import { gzipSync } from "zlib";
import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { bootTracker } from "../helpers/tracker-dom";

const REPLAY = readFileSync(path.join(process.cwd(), "public/t-r.js"), "utf8");

// Hard budget from docs/redesign/24. The record-only @rrweb/record build
// gzips to ~24KB; a leak of the full rrweb package (replayer included) would
// blow well past this, so the gate doubles as an import-hygiene check.
const REPLAY_SIZE_BUDGET = 46080;
const CORE_SIZE_BUDGET = 3072;

type Req = { url: string; method: string; body: unknown };

type BootCfg = { site: string; ep: string; vid?: string };

function bootReplay(opts: {
  boot?: BootCfg | null;
  config?: unknown;
  configReject?: boolean;
  html?: string;
}) {
  const {
    boot = { site: "example.com", ep: "https://app.test/api/replay" },
    config,
    configReject,
    html = "<p>hello</p>",
  } = opts;

  const dom = new JSDOM(`<!doctype html><html><head></head><body>${html}</body></html>`, {
    url: "https://example.com/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const win = dom.window;

  const requests: Req[] = [];
  win.fetch = ((u: string, init?: { method?: string; body?: unknown }) => {
    const method = init?.method || "GET";
    requests.push({ url: String(u), method, body: init?.body });
    if (method === "GET") {
      if (configReject) return Promise.reject(new Error("net"));
      return Promise.resolve({ json: () => Promise.resolve(config) });
    }
    return Promise.resolve({ ok: true, status: 202 });
  }) as unknown as typeof fetch;

  if (boot) (win as unknown as { __wsr?: BootCfg }).__wsr = boot;
  win.eval(REPLAY);

  return {
    win,
    requests,
    gets: () => requests.filter((r) => r.method === "GET"),
    posts: () => requests.filter((r) => r.method === "POST"),
    pagehide: () => win.dispatchEvent(new win.Event("pagehide")),
  };
}

// Let queued microtasks/macrotasks (config fetch -> record -> gzip -> POST) settle.
const tick = () => new Promise((r) => setTimeout(r, 0));

describe("size budgets", () => {
  it("t-r.js recorder chunk stays within budget gzipped", () => {
    const gz = gzipSync(readFileSync(path.join(process.cwd(), "public/t-r.js"))).length;
    expect(gz).toBeLessThan(REPLAY_SIZE_BUDGET);
  });

  it("the core loader addition keeps t.js under 3KB gzipped", () => {
    const gz = gzipSync(readFileSync(path.join(process.cwd(), "public/t.js"))).length;
    expect(gz).toBeLessThan(CORE_SIZE_BUDGET);
  });
});

describe("privacy selectors", () => {
  it("ships the [data-ws-unmask] escape hatch in the mask-all-text selector", () => {
    // Plan 24 promises data-ws-unmask; rrweb 2.1.0 has no unmaskTextSelector,
    // so it is expressed inside maskTextSelector. Guard against a refactor
    // silently dropping it from the built bundle.
    expect(REPLAY).toContain("[data-ws-unmask]");
  });
});

describe("boot guard", () => {
  it("does nothing (zero fetches) without window.__wsr", async () => {
    const page = bootReplay({ boot: null });
    await tick();
    expect(page.requests).toHaveLength(0);
  });
});

describe("server-driven config gating", () => {
  it("records nothing when config is off", async () => {
    const page = bootReplay({ config: { on: false } });
    await tick();
    await tick();
    expect(page.gets()).toHaveLength(1); // only the config request
    expect(page.posts()).toHaveLength(0);
    expect((page.win as unknown as { __wsr_active?: number }).__wsr_active).toBe(1);
  });

  it("survives a config fetch failure without throwing", async () => {
    const page = bootReplay({ configReject: true });
    await tick();
    expect(page.posts()).toHaveLength(0);
  });

  it("fetches config but ships no chunks at sample 0", async () => {
    const page = bootReplay({ config: { on: true, sample: 0 } });
    await tick();
    await tick();
    expect(page.gets()).toHaveLength(1);
    expect(page.posts()).toHaveLength(0);
  });
});

describe("chunk shipping", () => {
  it("ships a gzip=0 chunk with the documented query + JSON-array body", async () => {
    const page = bootReplay({ config: { on: true, sample: 1 } });
    // Config fetch resolves, record() starts and emits its initial snapshot.
    await tick();
    await tick();
    // Force a flush the way unload would.
    page.pagehide();
    await tick();
    await tick();

    const posts = page.posts();
    expect(posts.length).toBeGreaterThanOrEqual(1);

    const url = new URL(posts[0].url);
    const q = url.searchParams;
    expect(url.origin + url.pathname).toBe("https://app.test/api/replay");
    expect(q.get("site")).toBe("example.com");
    expect(q.get("rid")).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(q.get("seq")).toBe("0");
    expect(q.get("pc")).toBe("1");
    expect(q.get("gz")).toBe("0"); // jsdom has no CompressionStream

    const events = JSON.parse(String(posts[0].body));
    expect(Array.isArray(events)).toBe(true);
    expect(events.length).toBeGreaterThan(0);
    // rrweb events carry a numeric `type` and `timestamp`.
    expect(typeof events[0].type).toBe("number");
    expect(typeof events[0].timestamp).toBe("number");
  });
});

describe("core loader wiring", () => {
  it("defines __wsr and injects t-r.js when data-replay is set", () => {
    const plain = bootTracker({});
    expect(plain.document.querySelector('script[src*="t-r.js"]')).toBeNull();
    expect((plain.window as unknown as { __wsr?: unknown }).__wsr).toBeUndefined();

    const page = bootTracker({ attrs: { site: "example.com", replay: "" } });
    const el = page.document.querySelector('script[src*="t-r.js"]') as HTMLScriptElement | null;
    expect(el).toBeTruthy();
    expect(el!.src).toBe("https://app.websight.test/t-r.js");

    const wsr = (page.window as unknown as { __wsr?: { site: string; ep: string; vid?: string } }).__wsr;
    expect(wsr).toBeTruthy();
    expect(wsr!.site).toBe("example.com");
    expect(wsr!.ep).toBe("https://app.websight.test/api/replay");
  });
});
