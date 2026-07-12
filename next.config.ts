import type { NextConfig } from "next";
import { createMDX } from "fumadocs-mdx/next";

const nextConfig: NextConfig = {
  transpilePackages: ["three-globe", "three"],
  async rewrites() {
    return [
      { source: "/docs.md", destination: "/llms.mdx/docs" },
      { source: "/docs/:path*.md", destination: "/llms.mdx/docs/:path*" },
    ];
  },
  async redirects() {
    return [
      {
        source: "/docs/quickstart",
        destination: "/docs/getting-started/quickstart",
        permanent: true,
      },
      {
        source: "/docs/custom-events",
        destination: "/docs/tracking/custom-events",
        permanent: true,
      },
    ];
  },
};

const withMDX = createMDX();

export default withMDX(nextConfig);
