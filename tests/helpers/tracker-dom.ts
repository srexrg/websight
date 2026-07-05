import { readFileSync } from "fs";
import path from "path";
import { JSDOM } from "jsdom";

const CORE = readFileSync(path.join(process.cwd(), "public/t.js"), "utf8");
const EXT = readFileSync(path.join(process.cwd(), "public/t-x.js"), "utf8");

export type Beacon = { url: string; body: string };

export type TrackerPage = {
  window: JSDOM["window"];
  document: Document;
  /** Captured sendBeacon calls (the tracker's primary transport). */
  beacons: Beacon[];
  /** Parse all events across all beacons, flattened. */
  events: () => Record<string, unknown>[];
  /** Force a flush the way navigation would (visibilitychange -> hidden). */
  hide: () => void;
  /** Evaluate the extension chunk (public/t-x.js) in this page. */
  loadExtension: () => void;
};

/**
 * Boots the BUILT tracker bundle (public/t.js) in a fresh jsdom page - the
 * exact bytes that ship. Each call gets an isolated window/history/storage.
 */
export function bootTracker(opts: {
  url?: string;
  attrs?: Record<string, string>;
  scriptSrc?: string;
  html?: string;
  sendBeaconResult?: boolean;
  fetchSink?: Beacon[];
  /** Runs before the tracker evaluates (seed storage, pre-init stub, ...). */
  preBoot?: (win: JSDOM["window"]) => void;
}): TrackerPage {
  const {
    url = "https://example.com/",
    attrs = { site: "example.com" },
    scriptSrc = "https://app.websight.test/t.js",
    html = "",
    sendBeaconResult = true,
    fetchSink,
    preBoot,
  } = opts;

  const dom = new JSDOM(`<!doctype html><html><head></head><body>${html}</body></html>`, {
    url,
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const win = dom.window;
  const doc = win.document;

  const script = doc.createElement("script");
  script.src = scriptSrc;
  for (const [k, v] of Object.entries(attrs)) script.setAttribute(`data-${k}`, v);
  doc.head.appendChild(script);
  Object.defineProperty(doc, "currentScript", { value: script, configurable: true });

  const beacons: Beacon[] = [];
  Object.defineProperty(win.navigator, "sendBeacon", {
    value: (u: string, body: string) => {
      beacons.push({ url: u, body: String(body) });
      return sendBeaconResult;
    },
    configurable: true,
  });
  win.fetch = ((u: string, init?: { body?: string }) => {
    (fetchSink ?? beacons).push({ url: String(u), body: String(init?.body ?? "") });
    return Promise.resolve({ ok: true });
  }) as unknown as typeof fetch;

  preBoot?.(win);
  win.eval(CORE);

  return {
    window: win,
    document: doc,
    beacons,
    events: () =>
      beacons.flatMap(({ body }) => {
        const parsed = JSON.parse(body);
        return Array.isArray(parsed) ? parsed : [parsed];
      }),
    hide: () => {
      Object.defineProperty(doc, "visibilityState", { value: "hidden", configurable: true });
      // visibilitychange bubbles from document to window in real browsers
      doc.dispatchEvent(new win.Event("visibilitychange", { bubbles: true }));
    },
    loadExtension: () => win.eval(EXT),
  };
}

/** Click an element the way a user would (bubbling, cancelable). */
export function click(page: TrackerPage, el: Element): void {
  el.dispatchEvent(new page.window.MouseEvent("click", { bubbles: true, cancelable: true }));
}
