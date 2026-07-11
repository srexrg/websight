/**
 * WebSight tracker core (docs/redesign/01). Built with tsup to public/t.js
 * (IIFE, minified). Hard budget: < 3072 bytes gzipped - every feature here
 * pays rent. Zero runtime dependencies.
 *
 * Embed: <script defer src="https://your-app/t.js" data-site="example.com">
 * Config attributes: data-site (required), data-mode ("persistent"),
 * data-api, data-exclude (comma-separated path globs), data-hash,
 * data-track-outbound="false", data-track-downloads="false",
 * data-respect-dnt, data-vitals, data-errors, data-replay.
 */

type Props = Record<string, unknown> | undefined;

interface WsStub {
  (...args: unknown[]): void;
  q?: IArguments[];
  track?: (name: string, props?: Props) => void;
  identify?: (id?: string | null, traits?: Props) => void;
}

(() => {
  const W = window as typeof window & { __ws_loaded?: number; websight?: WsStub; __ws?: unknown };
  const D = document;
  const L = location;
  const N = navigator;
  const script = D.currentScript as HTMLScriptElement | null;
  if (!script || W.__ws_loaded) return;
  W.__ws_loaded = 1;

  const attr = (n: string) => script.getAttribute("data-" + n);
  const site = attr("site");

  // Public API is always installed (no-op when disabled) so caller code
  // never breaks. Pre-init stub queue: websight('track', name, props).
  const stub = W.websight;
  const install = (track: (n: string, p?: Props) => void, identify: (id?: string | null, t?: Props) => void) => {
    const api: WsStub = (...a: unknown[]) => {
      const m = a[0];
      if (m === "track") track(a[1] as string, a[2] as Props);
      else if (m === "identify") identify(a[1] as string, a[2] as Props);
    };
    api.track = track;
    api.identify = identify;
    W.websight = api;
    const q = stub && stub.q;
    if (q) for (let i = 0; i < q.length; i++) api.apply(0, q[i] as unknown as unknown[]);
  };

  let off = !site || /^(localhost$|127\.|::1$|0\.0\.0\.0$)/.test(L.hostname) || L.protocol === "file:";
  try {
    if (localStorage.getItem("websight_ignore")) off = true;
  } catch {
    /* storage blocked */
  }
  if (attr("respect-dnt") != null && (N.doNotTrack === "1" || (W as unknown as { doNotTrack?: string }).doNotTrack === "1")) {
    off = true;
  }
  if (off) {
    install(() => {}, () => {});
    return;
  }

  const api = attr("api") || new URL(script.src).origin + "/api/track";
  const persistent = attr("mode") === "persistent";
  const hashMode = attr("hash") != null;
  const globs = (attr("exclude") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(
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

  const send = (name: string, props?: Props, url?: string) => {
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
      if (DL.test(a.pathname) && attr("track-downloads") !== "false") {
        send("download", { url: a.href });
      } else if (a.host && a.host !== L.host && /^https?:/.test(a.href) && attr("track-outbound") !== "false") {
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

  install(
    (n, p) => send(String(n), p),
    (id, traits) => {
      if (!persistent) return;
      uid = id ? String(id).slice(0, 128) : undefined;
      store("websight_uid", uid ?? null);
      if (uid && traits) send("identify", traits);
    },
  );

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
  if (attr("vitals") != null || attr("errors") != null) {
    // data-vitals may carry a 0..1 sample rate ("0.1"); bare presence = 100%.
    const vs = parseFloat(attr("vitals") as string);
    W.__ws = {
      send,
      vitals: attr("vitals") != null,
      vitalsSample: vs >= 0 && vs <= 1 ? vs : undefined,
      errors: attr("errors") != null,
    };
    const s = D.createElement("script");
    s.src = new URL("t-x.js", script.src).href;
    s.defer = true;
    D.head.appendChild(s);
  }

  // Lazy replay recorder chunk (docs/redesign/24). The attribute only pays
  // the script load; whether recording actually happens is decided by the
  // server config the chunk fetches, so the dashboard toggle is the switch.
  if (attr("replay") != null) {
    (W as typeof W & { __wsr?: unknown }).__wsr = {
      site,
      ep: api.replace(/\/track$/, "/replay"),
      vid,
    };
    const r = D.createElement("script");
    r.src = new URL("t-r.js", script.src).href;
    r.defer = true;
    D.head.appendChild(r);
  }
})();
