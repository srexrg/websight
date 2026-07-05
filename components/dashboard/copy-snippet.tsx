"use client";

import { useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";

export function CopySnippet({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-xl bg-[#0E1310] px-4 py-3.5 font-mono text-[12.5px] leading-relaxed text-[#EAF6EF]">
        <code>{code}</code>
      </pre>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {}
        }}
        className="absolute right-2 top-2 rounded-md bg-white/10 p-1.5 text-[#EAF6EF] hover:bg-white/20"
        aria-label="Copy snippet"
      >
        {copied ? <Check size={14} className="text-[#5FD3A6]" /> : <Copy size={14} />}
      </button>
    </div>
  );
}
