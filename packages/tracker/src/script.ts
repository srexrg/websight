/**
 * WebSight script-tag entry (docs/redesign/01). Built with tsup to public/t.js
 * (IIFE, minified). Hard budget: < 3072 bytes gzipped. Reads config from the
 * <script data-*> attributes and hands it to the shared core; the two lazy
 * chunks load as sibling <script> tags resolved against this script's src.
 *
 * Embed: <script defer src="https://your-app/t.js" data-site="example.com">
 * Config attributes: data-site (required), data-mode ("persistent"),
 * data-api, data-exclude (comma-separated path globs), data-hash,
 * data-track-outbound="false", data-track-downloads="false",
 * data-respect-dnt, data-allow-localhost, data-vitals, data-errors,
 * data-replay.
 */
import { createTracker } from "./core";

(() => {
  const D = document;
  const script = D.currentScript as HTMLScriptElement | null;
  if (!script) return;
  const attr = (n: string) => script.getAttribute("data-" + n);
  const load = (file: string) => {
    const s = D.createElement("script");
    s.src = new URL(file, script.src).href;
    s.defer = true;
    D.head.appendChild(s);
  };
  // data-vitals may carry a 0..1 sample rate ("0.1"); bare presence = 100%.
  const vitalsAttr = attr("vitals");
  const vs = parseFloat(vitalsAttr as string);
  createTracker(
    {
      site: attr("site") || "",
      api: attr("api") || new URL(script.src).origin + "/api/track",
      mode: attr("mode") === "persistent" ? "persistent" : undefined,
      hashRouting: attr("hash") != null,
      exclude: (attr("exclude") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      trackOutbound: attr("track-outbound") !== "false",
      trackDownloads: attr("track-downloads") !== "false",
      respectDnt: attr("respect-dnt") != null,
      allowLocalhost: attr("allow-localhost") != null,
      vitals: vitalsAttr != null ? (vs >= 0 && vs <= 1 ? vs : true) : false,
      errors: attr("errors") != null,
      replay: attr("replay") != null,
    },
    { loadX: () => load("t-x.js"), loadR: () => load("t-r.js") },
  );
})();
