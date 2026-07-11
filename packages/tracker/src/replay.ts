/**
 * WebSight session replay recorder chunk (docs/redesign/24). Built to
 * public/t-r.js; loaded by the core only when the embed sets data-replay.
 * Recording config (enabled / sample rate / text masking) comes from
 * GET /api/replay, so the dashboard toggle governs recording without a
 * snippet change. Privacy defaults are non-negotiable here: all inputs
 * masked, [data-ws-mask] elements blocked, canvas and cross-origin iframes
 * never recorded.
 */
import { record } from "@rrweb/record";

type WsrBoot = { site: string; ep: string; vid?: string };

(() => {
  const W = window as typeof window & { __wsr?: WsrBoot; __wsr_active?: 1 };
  const boot = W.__wsr;
  if (!boot || W.__wsr_active) return;
  W.__wsr_active = 1;
  const { site, ep, vid } = boot;

  const MAX_MS = 60 * 60 * 1000; // hard caps per docs/redesign/24
  const MAX_SENT = 10 * 1024 * 1024; // compressed bytes shipped
  const MAX_CHUNKS = 500;
  const FLUSH_MS = 5000;
  const FLUSH_BYTES = 256 * 1024; // uncompressed JSON size
  const KEEPALIVE_MAX = 60 * 1024; // Chrome caps keepalive bodies at 64KB

  fetch(`${ep}?site=${encodeURIComponent(site)}`)
    .then((r) => r.json())
    .then((cfg: { on?: boolean; sample?: number; maskText?: boolean }) => {
      if (!cfg || !cfg.on) return;
      const sample = typeof cfg.sample === "number" ? cfg.sample : 1;
      // One decision per page load; holds across SPA navigations.
      if (Math.random() >= sample) return;
      start(!!cfg.maskText);
    })
    .catch(() => {});

  function start(maskText: boolean) {
    const rid =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            return (c === "x" ? r : (r & 3) | 8).toString(16);
          });
    const t0 = Date.now();
    let seq = 0;
    let pc = 1;
    let sent = 0;
    let buf: unknown[] = [];
    let bufBytes = 0;
    let stopped = false;
    let stopFn: (() => void) | undefined;

    const stop = () => {
      if (stopped) return;
      stopped = true;
      if (stopFn) stopFn();
      clearInterval(timer);
    };

    const gzip = (json: string): Promise<{ body: string | ArrayBuffer; gz: 0 | 1 }> => {
      const CS = (W as unknown as { CompressionStream?: typeof CompressionStream }).CompressionStream;
      if (!CS) return Promise.resolve({ body: json, gz: 0 });
      const stream = new Blob([json]).stream().pipeThrough(new CS("gzip"));
      return new Response(stream).arrayBuffer().then(
        (b) => ({ body: b, gz: 1 as const }),
        () => ({ body: json, gz: 0 as const }),
      );
    };

    function flush(final: boolean) {
      if (stopped || !buf.length) return;
      if (Date.now() - t0 > MAX_MS || sent > MAX_SENT || seq >= MAX_CHUNKS) {
        stop();
        return;
      }
      const events = buf;
      buf = [];
      bufBytes = 0;
      const mySeq = seq++;
      const json = JSON.stringify(events);
      void gzip(json).then(({ body, gz }) => {
        const size = typeof body === "string" ? body.length : body.byteLength;
        // Final flushes ride keepalive, which caps the body; accept losing an
        // oversized tail (plan 24 edge case) rather than block unload.
        if (final && size > KEEPALIVE_MAX) return;
        sent += size;
        const u =
          `${ep}?site=${encodeURIComponent(site)}&rid=${rid}&seq=${mySeq}` +
          `&pc=${pc}&gz=${gz}` +
          (vid ? `&vid=${encodeURIComponent(vid)}` : "");
        fetch(u, {
          method: "POST",
          body,
          keepalive: final,
          headers: { "content-type": "application/octet-stream" },
        }).catch(() => {});
      });
    }

    const timer = setInterval(() => flush(false), FLUSH_MS);

    // SPA page counter. The core already wraps history; wrapping again is
    // safe and keeps this chunk independent of core internals. Only count
    // real path changes (replaceState loops must not inflate page_count).
    let lastPath = location.pathname;
    const bump = () => {
      if (location.pathname !== lastPath) {
        lastPath = location.pathname;
        pc++;
      }
    };
    const H = history;
    const wrap = (fn: History["pushState"]): History["pushState"] =>
      function (this: History, ...args: Parameters<History["pushState"]>) {
        fn.apply(this, args);
        bump();
      };
    H.pushState = wrap(H.pushState);
    H.replaceState = wrap(H.replaceState);
    addEventListener("popstate", bump);

    addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush(true);
    });
    addEventListener("pagehide", () => flush(true));

    // record() is started last, once gzip/flush/stop/timer above are all
    // initialized. rrweb emits the initial full snapshot synchronously from
    // inside this call, and a real page's snapshot easily exceeds FLUSH_BYTES,
    // so emit() flushes it immediately - reaching gzip(). If record() ran before
    // gzip's `const` initializer, that first flush would hit gzip in its
    // temporal dead zone; rrweb swallows the emit error, so recording would
    // limp on while silently dropping the one chunk that carries the full
    // snapshot, leaving a blank (white) replay. Recording must also never break
    // the host page: a record() failure (exotic DOM, CSP) disables replay while
    // analytics keep working.
    try {
      stopFn = record({
        emit(e) {
          buf.push(e);
          bufBytes += JSON.stringify(e).length;
          if (bufBytes >= FLUSH_BYTES) flush(false);
        },
        maskAllInputs: true,
        blockSelector: "[data-ws-mask]",
        // "Mask all text" spares [data-ws-unmask] subtrees: rrweb masks text whose
        // parent element matches this selector, so :not(marked, inside-marked)
        // masks everything else. Inputs stay masked regardless (maskAllInputs).
        ...(maskText ? { maskTextSelector: ":not([data-ws-unmask], [data-ws-unmask] *)" } : {}),
        checkoutEveryNms: 120000,
        recordCanvas: false,
        recordCrossOriginIframes: false,
      });
    } catch {
      clearInterval(timer);
    }
  }
})();
