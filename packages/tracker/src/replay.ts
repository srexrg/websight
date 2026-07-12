/**
 * WebSight session replay recorder chunk (docs/redesign/24). Shared by the
 * t-r.js script-tag chunk and the npm package's dynamic import; loaded only
 * when replay is enabled. Recording config (enabled / sample rate / text
 * masking) comes from GET /api/replay, so the dashboard toggle governs
 * recording without a snippet change. Privacy defaults are non-negotiable
 * here: all inputs masked, [data-ws-mask] elements blocked, canvas and
 * cross-origin iframes never recorded.
 */
import { record } from "@rrweb/record";

export type ReplayBoot = { site: string; ep: string; vid?: string };

export function startReplay(boot: ReplayBoot | undefined): void {
  const W = window as typeof window & { __wsr?: ReplayBoot; __wsr_active?: 1 };
  // Re-entry guard protects against double loading in both worlds (a duplicate
  // script tag or a second init()).
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
        // Throttle the high-frequency, low-signal sources so we stop paying to
        // store, upload and re-download data we never use in playback. Scroll
        // and media events are sampled; inputs record only their final value
        // (also a privacy win - keystroke-by-keystroke is never captured, on top
        // of maskAllInputs). Mouse moves and interactions stay at full rate:
        // they keep playback smooth and feed the click / rage / dead-click
        // markers (and any future heatmap).
        sampling: {
          scroll: 500,
          media: 800,
          input: "last",
        },
        // Strip nodes that never affect the replay: <script> (neutered on
        // playback anyway), comments, favicons, head whitespace, and the meta
        // soup. Shrinks every full snapshot - by far the largest chunk - cutting
        // storage, egress and playback parse time.
        slimDOMOptions: {
          script: true,
          comment: true,
          headFavicon: true,
          headWhitespace: true,
          headMetaDescKeywords: true,
          headMetaSocial: true,
          headMetaRobots: true,
          headMetaHttpEquiv: true,
          headMetaAuthorship: true,
          headMetaVerification: true,
        },
        checkoutEveryNms: 120000,
        recordCanvas: false,
        recordCrossOriginIframes: false,
      });
    } catch {
      clearInterval(timer);
    }
  }
}
