import type { MetadataRoute } from "next";
import { DATA } from "@/data/site.config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: DATA.name,
    short_name: DATA.name,
    description: DATA.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
