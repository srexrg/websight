/**
 * WebSight lazy extension chunk (docs/redesign/01 milestone 4): Web Vitals
 * (12) and error capture (13). Built to public/t-x.js; loaded by the core
 * only when the embed sets data-vitals / data-errors, so its weight (the
 * web-vitals library) never touches the core budget.
 */
import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals/attribution";
import type { Metric } from "web-vitals";

type Send = (name: string, props?: Record<string, unknown>) => void;
type Attrib = { target?: string; largestShiftTarget?: string; interactionTarget?: string; loadState?: string };

(() => {
  const ws = (window as unknown as { __ws?: { send: Send; vitals?: boolean; vitalsSample?: number; errors?: boolean } }).__ws;
  if (!ws) return;

  // Sample whole-page vitals together (one coin flip per load), so a sampled
  // site still yields complete per-load metric sets. Default: report all.
  if (ws.vitals && (ws.vitalsSample == null || Math.random() < ws.vitalsSample)) {
    const report = (m: Metric) => {
      const a = (m as { attribution?: Attrib }).attribution || {};
      // The element/selector responsible, per metric (attribution build only).
      const element =
        m.name === "LCP" ? a.target
        : m.name === "CLS" ? a.largestShiftTarget
        : m.name === "INP" ? a.interactionTarget
        : undefined;
      ws.send("web_vital", {
        metric: m.name,
        // CLS is a unitless score (~0-1); everything else is milliseconds.
        value: m.name === "CLS" ? Math.round(m.value * 10000) / 10000 : Math.round(m.value),
        rating: m.rating,
        nav: m.navigationType,
        id: m.id,
        element: element ? String(element).slice(0, 120) : undefined,
        loadState: a.loadState,
      });
    };
    onLCP(report);
    onCLS(report);
    onINP(report);
    onFCP(report);
    onTTFB(report);
  }

  if (ws.errors) {
    // Client-side dedupe: cap the same light fingerprint to 5 per page session,
    // so an error loop can't flood the beacon queue (server caps again).
    const seen: Record<string, number> = {};
    const origin = location.origin;
    const emit = (props: Record<string, unknown>) => {
      const key = `${props.message}|${props.filename ?? ""}|${props.line ?? ""}`;
      seen[key] = (seen[key] || 0) + 1;
      if (seen[key] > 5) return;
      ws.send("error", props);
    };
    addEventListener("error", (e) => {
      if (!(e instanceof ErrorEvent)) return; // resource load errors: not JS errors
      const fn = e.filename ? String(e.filename) : undefined;
      emit({
        message: String(e.message).slice(0, 500),
        type: (e.error && e.error.name ? String(e.error.name) : "Error").slice(0, 60),
        filename: fn ? fn.slice(0, 300) : undefined,
        line: e.lineno || undefined,
        col: e.colno || undefined,
        stack: e.error && e.error.stack ? String(e.error.stack).slice(0, 4000) : undefined,
        // Errors from scripts off our own origin are the #1 noise source.
        external: fn ? !fn.startsWith(origin) : undefined,
      });
    });
    addEventListener("unhandledrejection", (e) => {
      const r = (e as PromiseRejectionEvent).reason;
      emit({
        message: String((r && r.message) || r).slice(0, 500),
        type: (r && r.name ? String(r.name) : "UnhandledRejection").slice(0, 60),
        stack: r && r.stack ? String(r.stack).slice(0, 4000) : undefined,
        promise: true,
      });
    });
  }
})();
