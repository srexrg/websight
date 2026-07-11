import { defineConfig } from "tsup";

/**
 * Builds the tracker into public/ so Next serves it from the app origin:
 *   t.js   - core, hard budget < 3072 bytes gzipped (checked in tests)
 *   t-x.js - lazy extension chunk (web vitals + errors), loaded on demand
 *   t-r.js - lazy session-replay recorder chunk (rrweb), loaded on demand
 */
export default defineConfig([
  {
    entry: { t: "packages/tracker/src/index.ts" },
    outDir: "public",
    format: "iife",
    platform: "browser",
    target: "es2019",
    minify: true,
    clean: false,
    outExtension: () => ({ js: ".js" }),
  },
  {
    entry: { "t-x": "packages/tracker/src/x.ts" },
    outDir: "public",
    format: "iife",
    platform: "browser",
    target: "es2019",
    minify: true,
    clean: false,
    noExternal: [/web-vitals/],
    outExtension: () => ({ js: ".js" }),
  },
  {
    entry: { "t-r": "packages/tracker/src/replay.ts" },
    outDir: "public",
    format: "iife",
    platform: "browser",
    target: "es2019",
    minify: true,
    clean: false,
    noExternal: [/rrweb/],
    outExtension: () => ({ js: ".js" }),
  },
]);
