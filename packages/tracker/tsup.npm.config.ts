import { defineConfig } from "tsup";

/**
 * npm package build (dist/). Two builds share one dist:
 *
 * 1. index: ESM-only with code splitting. The vitals/errors and replay chunks
 *    are reached via dynamic import from init(), so they never touch a
 *    consumer's main bundle. web-vitals and @rrweb/record are bundled into
 *    those chunks - the published package has zero runtime dependencies. This
 *    build carries `clean` (it owns wiping dist) and must NOT get the
 *    "use client" banner: marking init/track as client-only would break
 *    importing them from a server component.
 *
 * 2. react: the <Analytics /> wrapper (websight/react, aliased as
 *    websight/next). "./index.js" is external so dist/react.js imports the
 *    SAME dist/index.js module instance at runtime (shared memoized api)
 *    instead of bundling a second copy of the core; react is external so it
 *    resolves to the host app's copy. The "use client" banner is added to the
 *    OUTPUT because esbuild strips the source directive during bundling, and
 *    React Server Components need it present in the emitted file. This build
 *    must NOT carry `clean` (it would delete build one's output) and no
 *    splitting.
 */
export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    outDir: "dist",
    format: "esm",
    platform: "browser",
    target: "es2019",
    splitting: true,
    dts: true,
    sourcemap: true,
    clean: true,
  },
  {
    entry: { react: "src/react.tsx" },
    outDir: "dist",
    format: "esm",
    platform: "browser",
    target: "es2019",
    dts: true,
    sourcemap: true,
    external: ["react", "./index.js"],
    banner: { js: '"use client";' },
  },
]);
