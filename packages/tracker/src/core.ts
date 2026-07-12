/**
 * WebSight tracker core engine. One implementation powers both entry points:
 * the script-tag IIFE (built to public/t.js, hard budget < 3072 bytes gzipped)
 * and the npm package (init/track/identify). Every feature here pays rent.
 * Zero runtime dependencies.
 *
 * The entries differ only in how they read config and how they load the two
 * lazy chunks (vitals/errors and replay): the script tag injects <script>
 * tags, the npm package uses dynamic import. Everything else lives here.
 */

export type Props = Record<string, unknown>;

export interface WebsightApi {
  track(name: string, props?: Props): void;
  identify(id?: string | null, traits?: Props): void;
}

export interface WebsightOptions {
  /** Site domain registered in WebSight, e.g. "example.com". Required. */
  site: string;
  /** Origin of the WebSight deployment the events are sent to. Default: "https://websight.srexrg.me". */
  host?: string;
  /** Full track endpoint URL. Overrides host. */
  api?: string;
  /** "persistent" stores an anonymous visitor id in localStorage and enables identify(). Default: "stateless" (nothing stored, ever). */
  mode?: "stateless" | "persistent";
  /** Track hash-based routing (#/page) as pageviews. Default: false. */
  hashRouting?: boolean;
  /** Path globs to exclude, e.g. ["/admin/*", "/health"]. */
  exclude?: string[];
  /** Auto-track clicks on links to other origins. Default: true. */
  trackOutbound?: boolean;
  /** Auto-track clicks on file download links. Default: true. */
  trackDownloads?: boolean;
  /** Disable tracking for visitors with Do Not Track enabled. Default: false. */
  respectDnt?: boolean;
  /** Track on localhost (useful in development). Default: false. */
  allowLocalhost?: boolean;
  /** Collect Core Web Vitals. true = all page loads, a number 0..1 = sample rate. Default: false. */
  vitals?: boolean | number;
  /** Capture JS errors and unhandled rejections. Default: false. */
  errors?: boolean;
  /** Load the session replay recorder (recording itself is toggled from the dashboard). Default: false. */
  replay?: boolean;
}

/** Internal: how each entry loads the lazy chunks (script tag injects <script>, npm uses dynamic import). */
export interface ChunkLoaders {
  loadX(): void;
  loadR(): void;
}

type P = Props | undefined;

interface WsStub {
  (...args: unknown[]): void;
  q?: IArguments[];
  track?: (name: string, props?: P) => void;
  identify?: (id?: string | null, traits?: P) => void;
}

export function createTracker(o: WebsightOptions, loaders: ChunkLoaders): WebsightApi {
  const W = window as typeof window & { __ws_loaded?: number; websight?: WsStub; __ws?: unknown };
  const D = document;
  const L = location;
  const N = navigator;

  // A second init must be harmless: delegate to the tracker already installed
  // (the script tag guards duplicate tags the same way).
  if (W.__ws_loaded) {
    const ex = W.websight;
    return {
      track: (n, p) => {
        if (ex && ex.track) ex.track(n, p);
      },
      identify: (id, t) => {
        if (ex && ex.identify) ex.identify(id, t);
      },
    };
  }
  W.__ws_loaded = 1;

  const site = o.site;

  // Public API is always installed (no-op when disabled) so caller code
  // never breaks. Pre-init stub queue: websight('track', name, props).
  const stub = W.websight;
  const install = (track: (n: string, p?: P) => void, identify: (id?: string | null, t?: P) => void) => {
    const api: WsStub = (...a: unknown[]) => {
      const m = a[0];
      if (m === "track") track(a[1] as string, a[2] as P);
      else if (m === "identify") identify(a[1] as string, a[2] as P);
    };
    api.track = track;
    api.identify = identify;
    W.websight = api;
    const q = stub && stub.q;
    if (q) for (let i = 0; i < q.length; i++) api.apply(0, q[i] as unknown as unknown[]);
  };

  let off =
    !site ||
    (!o.allowLocalhost && /^(localhost$|127\.|::1$|0\.0\.0\.0$)/.test(L.hostname)) ||
    L.protocol === "file:";
  try {
    if (localStorage.getItem("websight_ignore")) off = true;
  } catch {
    /* storage blocked */
  }
  if (o.respectDnt && (N.doNotTrack === "1" || (W as unknown as { doNotTrack?: string }).doNotTrack === "1")) {
    off = true;
  }
  if (off) {
    install(
      () => {},
      () => {},
    );
    return { track() {}, identify() {} };
  }

  const api = o.api || (o.host || "https://websight.srexrg.me").replace(/\/$/, "") + "/api/track";
  const persistent = o.mode === "persistent";
  const hashMode = !!o.hashRouting;
  const globs = (o.exclude || []).map(
    (g) =>
      new RegExp(
        "^" +
          g
            .split("*")
            .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
            .join(".*") +
          "$",
      ),
  );
  const excluded = () => globs.some((r) => r.test(L.pathname));

  // Persistent-mode identity (stateless mode stores nothing, ever).
  let vid: string | undefined;
  let uid: string | undefined;
  const store = (k: string, v?: string | null): string | undefined => {
    try {
      if (v === undefined) return localStorage.getItem(k) || undefined;
      if (v) localStorage.setItem(k, v);
      else localStorage.removeItem(k);
    } catch {
      /* Safari private mode etc: degrade to stateless */
    }
    return undefined;
  };
  if (persistent) {
    vid = store("websight_vid");
    if (!vid) {
      vid = (Date.now().toString(36) + Math.random().toString(36).slice(2, 12)).slice(0, 20);
      store("websight_vid", vid);
    }
    uid = store("websight_uid");
  }

  // Queue + transport: flush at 3 events / 2s / page hide; the very first
  // event (onboarding "waiting for first event") flushes immediately.
  let q: Record<string, unknown>[] = [];
  let timer: ReturnType<typeof setTimeout> | 0 = 0;
  let first = true;
  const flush = () => {
    if (timer) clearTimeout(timer);
    timer = 0;
    if (!q.length) return;
    const body = JSON.stringify(q.length > 1 ? q : q[0]);
    q = [];
    try {
      if (N.sendBeacon && N.sendBeacon(api, body)) return;
    } catch {
      /* fall through */
    }
    fetch(api, { method: "POST", body, keepalive: true, mode: "no-cors" }).catch(() => {});
  };

  // Client-side query stripping: only utm_*, ref, source and paid click ids
  // (server needs those for channel classification) ever leave the page.
  const cleanUrl = () => {
    const keep = new URLSearchParams();
    new URLSearchParams(L.search).forEach((v, k) => {
      if (/^(utm_|ref$|source$|gclid$|fbclid$|msclkid$|ttclid$|twclid$|li_fat_id$)/.test(k)) keep.append(k, v);
    });
    const qs = keep.toString();
    return L.pathname + (qs ? "?" + qs : "") + (hashMode ? L.hash : "");
  };

  const send = (name: string, props?: P, url?: string) => {
    if (!name || excluded()) return;
    q.push({
      site,
      name,
      url: url || cleanUrl(),
      ref: D.referrer || undefined,
      title: D.title || undefined,
      w: screen.width,
      h: screen.height,
      lang: N.language,
      vid,
      uid,
      props,
      ts: Date.now(),
      sdk: "js@2.0.0",
    });
    if (first || q.length >= 3) {
      first = false;
      flush();
    } else if (!timer) {
      timer = setTimeout(flush, 2000);
    }
  };

  // Pageviews: initial + SPA navigations, deduped on identical URLs
  // (replaceState loops, hash-only changes outside data-hash mode).
  let lastUrl = "";
  const page = () => {
    const u = cleanUrl();
    if (u === lastUrl) return;
    lastUrl = u;
    send("pageview", undefined, u);
  };

  const H = history;
  const wrap = (fn: History["pushState"]): History["pushState"] =>
    function (this: History, ...args: Parameters<History["pushState"]>) {
      fn.apply(this, args);
      page();
    };
  H.pushState = wrap(H.pushState);
  H.replaceState = wrap(H.replaceState);
  addEventListener("popstate", page);
  if (hashMode) addEventListener("hashchange", page);

  // Auto-capture: data-ws-event, outbound links, file downloads.
  const DL = /\.(pdf|zip|dmg|pkg|exe|msi|apk|csv|xlsx?|docx?|pptx?|txt|rar|7z|gz|tar|mp3|mp4|mov|avi|wav|iso)(\?|#|$)/i;
  D.addEventListener(
    "click",
    (e) => {
      const t = e.target as Element | null;
      if (!t || !t.closest) return;
      const el = t.closest("[data-ws-event]");
      if (el) send(el.getAttribute("data-ws-event") as string);
      const a = t.closest("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      if (DL.test(a.pathname) && o.trackDownloads !== false) {
        send("download", { url: a.href });
      } else if (a.host && a.host !== L.host && /^https?:/.test(a.href) && o.trackOutbound !== false) {
        send("outbound_click", { url: a.href });
      }
    },
    true,
  );

  addEventListener(
    "submit",
    (e) => {
      const f = e.target as HTMLFormElement;
      if (f && f.tagName === "FORM") {
        const id = f.id || f.getAttribute("name");
        send("form_submit", id ? { form: id } : undefined);
      }
    },
    true,
  );

  addEventListener("visibilitychange", () => {
    if (D.visibilityState === "hidden") flush();
  });
  addEventListener("pagehide", flush);

  // Heartbeat: keep the visitor "online" while the tab is visible. A ping only
  // bumps the session's last_event_at server-side (no event stored); it stops
  // on tab close, so presence drops within the live window instead of lingering.
  const ping = () => {
    if (D.visibilityState !== "visible" || excluded()) return;
    const b = JSON.stringify({ site, vid, uid, h: 1 });
    try {
      if (N.sendBeacon && N.sendBeacon(api, b)) return;
    } catch {
      /* fall through */
    }
    fetch(api, { method: "POST", body: b, keepalive: true, mode: "no-cors" }).catch(() => {});
  };
  let hb: ReturnType<typeof setInterval> | 0 = setInterval(ping, 45000);
  addEventListener("pagehide", () => {
    if (hb) clearInterval(hb);
    hb = 0;
  });

  const identify = (id?: string | null, traits?: P) => {
    if (!persistent) return;
    uid = id ? String(id).slice(0, 128) : undefined;
    store("websight_uid", uid ?? null);
    if (uid && traits) send("identify", traits);
  };

  install((n, p) => send(String(n), p), identify);

  // Initial pageview: wait out prerendering, re-fire on bfcache restore.
  const start = () => page();
  if ((D as Document & { prerendering?: boolean }).prerendering) {
    addEventListener("prerenderingchange", start, { once: true });
  } else {
    start();
  }
  addEventListener("pageshow", (e) => {
    if ((e as PageTransitionEvent).persisted) {
      lastUrl = "";
      page();
    }
  });

  // Lazy extension chunk (web vitals / error capture).
  if (o.vitals === true || typeof o.vitals === "number" || o.errors) {
    // A numeric vitals value is a 0..1 sample rate; `true` means 100%.
    W.__ws = {
      send,
      vitals: o.vitals === true || typeof o.vitals === "number",
      vitalsSample: typeof o.vitals === "number" && o.vitals >= 0 && o.vitals <= 1 ? o.vitals : undefined,
      errors: !!o.errors,
    };
    loaders.loadX();
  }

  // Lazy replay recorder chunk (docs/redesign/24). Loading the chunk only pays
  // the script load; whether recording actually happens is decided by the
  // server config the chunk fetches, so the dashboard toggle is the switch.
  if (o.replay) {
    (W as typeof W & { __wsr?: unknown }).__wsr = {
      site,
      ep: api.replace(/\/track$/, "/replay"),
      vid,
    };
    loaders.loadR();
  }

  return { track: (n, p) => send(String(n), p), identify };
}
