"use client";

/**
 * React wrapper for the websight tracker. <Analytics /> boots the tracker on
 * mount; SPA navigations are counted by the core's history patching, so no
 * router integration is needed. websight/next is an alias of this module.
 */
import { useEffect } from "react";
import { init } from "./index.js";

import type { WebsightOptions } from "./core";

export type AnalyticsProps = WebsightOptions;

export function Analytics(props: AnalyticsProps): null {
  useEffect(() => {
    init(props);
    // No cleanup: the tracker is page-global by design and init() is
    // idempotent, so remounts (StrictMode, layout changes) are harmless.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export { init, track, identify } from "./index.js";
export type { Props, WebsightApi, WebsightOptions } from "./core";
