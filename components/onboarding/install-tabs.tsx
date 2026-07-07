"use client";

import { useState } from "react";
import { CopySnippet } from "@/components/dashboard/copy-snippet";

/**
 * Per-platform install instructions (docs/redesign/17). The base is a single
 * <script> tag; each tab reframes it for that platform. `data-site` is the
 * site's primary domain, matching the tracker's resolution.
 */
const PLATFORMS = [
  "HTML",
  "Next.js",
  "React",
  "Vue",
  "WordPress",
  "Shopify",
  "Webflow",
  "Framer",
  "GTM",
] as const;
type Platform = (typeof PLATFORMS)[number];

function snippet(platform: Platform, origin: string, domain: string): { code: string; note?: string } {
  const tag = `<script defer src="${origin}/t.js" data-site="${domain}"></script>`;
  switch (platform) {
    case "HTML":
      return { code: tag, note: "Paste inside your <head>, before the closing tag." };
    case "Next.js":
      return {
        code: `import Script from "next/script";\n\n// in app/layout.tsx <head> or root layout\n<Script defer src="${origin}/t.js" data-site="${domain}" />`,
        note: "Use next/script with the defer strategy in your root layout.",
      };
    case "React":
      return {
        code: `<!-- public/index.html, inside <head> -->\n${tag}`,
        note: "Add to index.html so it loads once, outside the React tree.",
      };
    case "Vue":
      return { code: `<!-- index.html, inside <head> -->\n${tag}`, note: "Add to index.html in your project root." };
    case "WordPress":
      return {
        code: tag,
        note: "Paste into your theme's header.php before </head>, or use a 'header scripts' plugin (e.g. WPCode). No plugin required.",
      };
    case "Shopify":
      return {
        code: tag,
        note: "Online Store → Themes → Edit code → layout/theme.liquid, before </head>.",
      };
    case "Webflow":
      return { code: tag, note: "Project Settings → Custom Code → Head Code. Publish to apply." };
    case "Framer":
      return { code: tag, note: "Site Settings → General → Custom Code → End of <head> tag." };
    case "GTM":
      return {
        code: tag,
        note: "New Tag → Custom HTML, paste the snippet, trigger on All Pages. Prefer direct install if possible (GTM adds latency).",
      };
  }
}

export function InstallTabs({ domain }: { domain: string }) {
  const [platform, setPlatform] = useState<Platform>("HTML");
  const [origin] = useState(() => (typeof window !== "undefined" ? window.location.origin : "https://websight.srexrg.me"));
  const { code, note } = snippet(platform, origin, domain);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1">
        {PLATFORMS.map((p) => (
          <button
            key={p}
            onClick={() => setPlatform(p)}
            className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
              platform === p ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <CopySnippet code={code} />
      {note && <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{note}</p>}
    </div>
  );
}
