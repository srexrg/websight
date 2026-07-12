import type { MetadataRoute } from "next";
import { DATA } from "@/data/site.config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private or non-content surfaces. Auth-gated pages also carry
        // noindex metadata; share links are user data, not site content.
        disallow: [
          "/api/",
          "/dashboard",
          "/onboarding",
          "/settings",
          "/auth",
          "/share/",
        ],
      },
    ],
    sitemap: `${DATA.url}/sitemap.xml`,
  };
}
