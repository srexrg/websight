"use client";

import { useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";

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

function snippet(
  platform: Platform,
  origin: string,
  domain: string,
  mode: "stateless" | "persistent",
): { code: string; note?: string } {
  // Persistent identity is opt-in on the tag: without data-mode the tracker
  // stores nothing and the site's privacy_mode has no client half.
  const attrs = `data-site="${domain}"${mode === "persistent" ? ` data-mode="persistent"` : ""}`;
  const tag = `<script defer src="${origin}/t.js" ${attrs}></script>`;
  switch (platform) {
    case "HTML":
      return { code: tag, note: "Paste inside your <head>, before the closing tag." };
    case "Next.js":
      return {
        code: `import Script from "next/script";\n\n// in app/layout.tsx <head> or root layout\n<Script defer src="${origin}/t.js" ${attrs} />`,
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

/**
 * Lightweight, robust highlighter: colors strings and comments (the landing's
 * emerald palette) and leaves the rest light. Works across every snippet shape
 * (HTML script tag + JS) without a full tokenizer.
 */
function highlight(code: string) {
  const parts: { t: string; c: string }[] = [];
  // comments (HTML + //) | double-quoted strings
  const re = /(<!--[\s\S]*?-->|\/\/[^\n]*)|("[^"]*")/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) {
    if (m.index > last) parts.push({ t: code.slice(last, m.index), c: "#EAF6EF" });
    parts.push({ t: m[0], c: m[1] ? "#6B7B72" : "#5BE5A8" });
    last = re.lastIndex;
  }
  if (last < code.length) parts.push({ t: code.slice(last), c: "#EAF6EF" });
  return parts;
}

/** Landing-grade dark code block with window chrome and a warm emerald glow. */
function CodeBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="overflow-hidden rounded-[14px] bg-[#0E1310] shadow-[0_18px_50px_-24px_rgba(14,156,110,0.45)]">
      <div className="flex items-center justify-between border-b border-white/[0.07] px-3.5 py-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="ml-2 font-mono text-[11px] text-[#8FA89B]">{label}</span>
        </div>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            } catch {}
          }}
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-white/[0.08] px-2 py-1 font-sans text-[11.5px] font-semibold text-[#C9CBD6] transition-colors hover:bg-brand hover:text-white"
          aria-label="Copy snippet"
        >
          {copied ? <Check size={13} weight="bold" className="text-[#5FD3A6]" /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="whitespace-pre-wrap px-4 py-3.5 font-mono text-[12.5px] leading-[1.65] [overflow-wrap:anywhere]">
        <code>
          {highlight(code).map((p, i) => (
            <span key={i} style={{ color: p.c }}>
              {p.t}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

export function InstallTabs({
  domain,
  mode = "stateless",
}: {
  domain: string;
  mode?: "stateless" | "persistent";
}) {
  const [platform, setPlatform] = useState<Platform>("HTML");
  const [origin] = useState(() => (typeof window !== "undefined" ? window.location.origin : "https://websight.srexrg.me"));
  const { code, note } = snippet(platform, origin, domain, mode);

  return (
    <div>
      <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PLATFORMS.map((p) => (
          <button
            key={p}
            onClick={() => setPlatform(p)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
              platform === p
                ? "bg-accent text-accent-foreground shadow-[0_1px_2px_rgba(16,24,40,.04)]"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <CodeBlock code={code} label={platform === "HTML" ? "index.html" : platform} />
      {note && <p className="mt-2.5 text-[12px] leading-relaxed text-muted-foreground">{note}</p>}
    </div>
  );
}
