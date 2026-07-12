import { defineConfig } from "tsup";

/**
 * npm package build (dist/). ESM-only with code splitting: the vitals/errors
 * and replay chunks are reached via dynamic import from init(), so they never
 * touch a consumer's main bundle. web-vitals and @rrweb/record are bundled
 * into those chunks - the published package has zero runtime dependencies.
 */
export default defineConfig({
  entry: { index: "src/index.ts" },
  outDir: "dist",
  format: "esm",
  platform: "browser",
  target: "es2019",
  splitting: true,
  dts: true,
  sourcemap: true,
  clean: true,
});
