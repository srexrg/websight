import { defineConfig } from "tsup";

/**
 * Builds the script-tag tracker into public/ so Next serves it from the app
 * origin. These are the IIFE bundles the <script defer src> embed loads:
 *   t.js   - script entry + core, hard budget < 3072 bytes gzipped (in tests)
 *   t-x.js - lazy extension chunk (web vitals + errors), loaded on demand
 *   t-r.js - lazy session-replay recorder chunk (rrweb), loaded on demand
 * The npm package build lives in tsup.npm.config.ts.
 */
export default defineConfig([
  {
    entry: { t: "packages/tracker/src/script.ts" },
    outDir: "public",
    format: "iife",
    platform: "browser",
    target: "es2019",
    minify: true,
    clean: false,
    outExtension: () => ({ js: ".js" }),
  },
  {
    entry: { "t-x": "packages/tracker/src/x.entry.ts" },
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
    entry: { "t-r": "packages/tracker/src/replay.entry.ts" },
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
