"use client";

import { useState } from "react";
import { installSteps } from "@/lib/landing/content";

const SNIPPET = `<script defer src="https://websight.srexrg.me/tracker.js" data-site="yoursite.com"></script>`;

export default function Install() {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(SNIPPET).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  }

  return (
    <section id="install">
      <div className="max-w-[1180px] mx-auto px-7 py-[90px]">
        {/* Section header */}
        <div className="text-center max-w-[600px] mx-auto mb-[44px]">
          <span className="text-[13px] font-bold tracking-[0.6px] text-brand uppercase">
            30-SECOND SETUP
          </span>
          <h2 className="text-[40px] font-extrabold tracking-[-1.2px] leading-[1.1] mt-3 mb-[14px] text-foreground">
            One line. That&apos;s it.
          </h2>
          <p className="text-[17px] leading-[1.55] text-[#5A5D69] m-0">
            Drop the snippet in your &lt;head&gt;. No build step, no config, no cookie banner.
          </p>
        </div>

        {/* Code block + steps */}
        <div className="max-w-[760px] mx-auto">
          {/* Dark code block */}
          <div className="bg-[#0E1310] rounded-[14px] px-[22px] py-5 font-mono text-[14px] leading-[1.7] text-[#C9CBD6] relative shadow-[0_18px_50px_-22px_rgba(14,156,110,0.4)]">
            {/* Syntax-colored snippet */}
            <span className="text-[#6B6E7B]">&lt;</span>
            <span className="text-[#E06C9B]">script</span>
            <span> </span>
            <span className="text-[#5FD3A6]">defer</span>
            <span> </span>
            <span className="text-[#5FD3A6]">src</span>
            <span className="text-[#6B6E7B]">=</span>
            <span className="text-[#5BE5A8]">&quot;https://websight.srexrg.me/tracker.js&quot;</span>
            <span> </span>
            <span className="text-[#5FD3A6]">data-site</span>
            <span className="text-[#6B6E7B]">=</span>
            <span className="text-[#5BE5A8]">&quot;yoursite.com&quot;</span>
            <span className="text-[#6B6E7B]">&gt;&lt;/</span>
            <span className="text-[#E06C9B]">script</span>
            <span className="text-[#6B6E7B]">&gt;</span>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="absolute top-[14px] right-[14px] flex items-center gap-[5px] bg-[#1E2420] text-[#C9CBD6] font-sans text-[12px] font-semibold px-[11px] py-[6px] rounded-[8px] cursor-pointer transition-colors hover:bg-brand hover:text-white"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 256 256"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z" />
              </svg>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          {/* 3 numbered steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-[18px] mt-6">
            {installSteps.map((step) => (
              <div key={step.n} className="flex flex-col gap-[7px]">
                <div className="flex items-center gap-[9px]">
                  <span className="w-6 h-6 rounded-[7px] bg-[#E7F6EF] text-[#0B7E58] font-mono text-[12px] font-bold flex items-center justify-center flex-shrink-0">
                    {step.n}
                  </span>
                  <span className="text-[14.5px] font-bold text-foreground">
                    {step.title}
                  </span>
                </div>
                <span className="text-[13.5px] leading-[1.5] text-[#5A5D69]">
                  {step.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
