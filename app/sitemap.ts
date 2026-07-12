import type { MetadataRoute } from "next";
import { source } from "@/lib/source";
import { DATA } from "@/data/site.config";

export const revalidate = false;

export default function sitemap(): MetadataRoute.Sitemap {
  // /compare routes are hardcoded: they are static marketing pages built in
  // this same release, not discoverable from the docs source.
  const staticPaths = [
    "/",
    "/compare",
    "/compare/google-analytics",
    "/compare/plausible",
    "/compare/umami",
  ];

  const staticRoutes = staticPaths.map((path) => ({
    url: path === "/" ? `${DATA.url}/` : `${DATA.url}${path}`,
  }));

  const docsRoutes = source.getPages().map((page) => ({
    url: `${DATA.url}${page.url}`,
  }));

  return [...staticRoutes, ...docsRoutes];
}
