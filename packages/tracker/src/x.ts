/**
 * WebSight lazy extension chunk (docs/redesign/01 milestone 4): Web Vitals
 * (12) and error capture (13). Built to public/t-x.js; loaded by the core
 * only when the embed sets data-vitals / data-errors, so its weight (the
 * web-vitals library) never touches the core budget.
 */
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals";

type Send = (name: string, props?: Record<string, unknown>) => void;

(() => {
  const ws = (window as unknown as { __ws?: { send: Send; vitals?: boolean; errors?: boolean } }).__ws;
  if (!ws) return;

  if (ws.vitals) {
    const report = (m: Metric) => {
      ws.send("web_vital", {
        metric: m.name,
        // CLS is a unitless score (~0-1); everything else is milliseconds.
        value: m.name === "CLS" ? Math.round(m.value * 10000) / 10000 : Math.round(m.value),
        rating: m.rating,
        nav: m.navigationType,
        id: m.id,
      });
    };
    onLCP(report);
    onCLS(report);
    onINP(report);
    onFCP(report);
    onTTFB(report);
  }

  if (ws.errors) {
    addEventListener("error", (e) => {
      if (!(e instanceof ErrorEvent)) return; // resource load errors: not JS errors
      ws.send("error", {
        message: String(e.message).slice(0, 500),
        source: e.filename ? String(e.filename).slice(0, 300) : undefined,
        line: e.lineno || undefined,
        col: e.colno || undefined,
        stack: e.error && e.error.stack ? String(e.error.stack).slice(0, 1500) : undefined,
      });
    });
    addEventListener("unhandledrejection", (e) => {
      const r = (e as PromiseRejectionEvent).reason;
      ws.send("error", {
        message: String((r && r.message) || r).slice(0, 500),
        stack: r && r.stack ? String(r.stack).slice(0, 1500) : undefined,
        promise: true,
      });
    });
  }
})();
