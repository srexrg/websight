/**
 * WebSight npm package entry. Exposes a typed init/track/identify surface over
 * the shared core (src/core.ts). The two lazy chunks (vitals/errors, replay)
 * are reached through dynamic import(), so they never touch a consumer's main
 * bundle unless the matching option is enabled.
 *
 * Byte-for-byte behavior of the script-tag build (public/t.js) lives in
 * src/script.ts; this file is the bundler-friendly counterpart.
 */
import { createTracker } from "./core";
import type { Props, WebsightApi, WebsightOptions } from "./core";

export type { Props, WebsightApi, WebsightOptions };

type WsStub = {
  (...args: unknown[]): void;
  q?: unknown[][];
  track?: (name: string, props?: Props) => void;
  identify?: (id?: string | null, traits?: Props) => void;
};
type WsWindow = Window & { websight?: WsStub; __ws?: unknown; __wsr?: unknown };

const NOOP: WebsightApi = { track() {}, identify() {} };
let api: WebsightApi | null = null;

/** Queue a call through the window.websight stub so init() replays it; mirrors the script-tag pre-init queue. */
function viaGlobal(method: "track" | "identify", a?: unknown, b?: unknown): void {
  if (typeof window === "undefined") return;
  const W = window as unknown as WsWindow;
  if (!W.websight) {
    const stub: WsStub = (...args: unknown[]) => {
      (stub.q = stub.q || []).push(args);
    };
    W.websight = stub;
  }
  W.websight(method, a, b);
}

export function init(options: WebsightOptions): WebsightApi {
  if (typeof window === "undefined") return NOOP; // SSR: importing and calling from a server bundle is safe
  if (api) return api;
  const W = window as unknown as WsWindow;
  api = createTracker(options, {
    loadX: () => {
      void import("./x")
        .then((m) => m.startExtension(W.__ws as Parameters<typeof m.startExtension>[0]))
        .catch(() => {});
    },
    loadR: () => {
      void import("./replay")
        .then((m) => m.startReplay(W.__wsr as Parameters<typeof m.startReplay>[0]))
        .catch(() => {});
    },
  });
  return api;
}

export function track(name: string, props?: Props): void {
  if (api) return api.track(name, props);
  viaGlobal("track", name, props);
}

export function identify(id?: string | null, traits?: Props): void {
  if (api) return api.identify(id, traits);
  viaGlobal("identify", id, traits);
}
