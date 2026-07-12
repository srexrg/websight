"use client";

import { useState } from "react";
import { installSteps } from "@/lib/landing/content";

type InstallTab = "script" | "npm";

const SCRIPT_SNIPPET = `<script defer src="https://websight.srexrg.me/t.js" data-site="yoursite.com"></script>`;
const NPM_SNIPPET = `npm install websight`;

const TABS: { key: InstallTab; label: string }[] = [
  { key: "script", label: "Script" },
  { key: "npm", label: "npm" },
];

export default function Install() {
  const [tab, setTab] = useState<InstallTab>("script");
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const snippet = tab === "script" ? SCRIPT_SNIPPET : NPM_SNIPPET;
    navigator.clipboard.writeText(snippet).then(() => {
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
          <p className="text-[17px] leading-[1.55] text-muted-foreground m-0">
            Drop the snippet in your &lt;head&gt;, or install the package. No build step, no config, no cookie banner.
          </p>
        </div>

        {/* Code block + steps */}
        <div className="max-w-[760px] mx-auto">
          {/* Tab switcher */}
          <div className="mb-4 flex justify-center">
            <div className="inline-flex rounded-lg bg-secondary/70 p-[3px]">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => {
                    setTab(t.key);
                    setCopied(false);
                  }}
                  aria-pressed={tab === t.key}
                  className={`rounded-md px-3.5 py-1 text-[13px] font-semibold transition-colors ${
                    tab === t.key
                      ? "bg-accent text-accent-foreground shadow-[0_1px_2px_rgba(16,24,40,.06)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dark code block */}
          <div className="bg-[#0E1310] ring-1 ring-white/[0.07] rounded-[14px] px-[22px] py-5 font-mono text-[14px] leading-[1.7] text-[#C9CBD6] relative shadow-[0_18px_50px_-22px_rgba(14,156,110,0.4)]">
            {tab === "script" ? (
              /* Syntax-colored script snippet */
              <div className="pr-[70px]">
                <span className="text-[#6B6E7B]">&lt;</span>
                <span className="text-[#E06C9B]">script</span>
                <span> </span>
                <span className="text-[#5FD3A6]">defer</span>
                <span> </span>
                <span className="text-[#5FD3A6]">src</span>
                <span className="text-[#6B6E7B]">=</span>
                <span className="text-[#5BE5A8]">&quot;https://websight.srexrg.me/t.js&quot;</span>
                <span> </span>
                <span className="text-[#5FD3A6]">data-site</span>
                <span className="text-[#6B6E7B]">=</span>
                <span className="text-[#5BE5A8]">&quot;yoursite.com&quot;</span>
                <span className="text-[#6B6E7B]">&gt;&lt;/</span>
                <span className="text-[#E06C9B]">script</span>
                <span className="text-[#6B6E7B]">&gt;</span>
              </div>
            ) : (
              /* Syntax-colored npm snippet */
              <div className="pr-[70px]">
                <div>
                  <span className="text-[#6B6E7B]">$ </span>
                  <span className="text-[#E06C9B]">npm</span>
                  <span> install </span>
                  <span className="text-[#5BE5A8]">websight</span>
                </div>
                <div className="mt-3">
                  <span className="text-[#E06C9B]">import</span>
                  <span>{" { init } "}</span>
                  <span className="text-[#E06C9B]">from</span>
                  <span> </span>
                  <span className="text-[#5BE5A8]">&quot;websight&quot;</span>
                </div>
                <div>
                  <span className="text-[#5FD3A6]">init</span>
                  <span>{"({ site: "}</span>
                  <span className="text-[#5BE5A8]">&quot;yoursite.com&quot;</span>
                  <span>{" })"}</span>
                </div>
                <div className="mt-3 text-[#6B6E7B]">
                  {"// React? Mount <Analytics /> from websight/react"}
                </div>
              </div>
            )}

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
                  <span className="w-6 h-6 rounded-[7px] bg-accent text-accent-foreground font-mono text-[12px] font-bold flex items-center justify-center flex-shrink-0">
                    {step.n}
                  </span>
                  <span className="text-[14.5px] font-bold text-foreground">
                    {step.title}
                  </span>
                </div>
                <span className="text-[13.5px] leading-[1.5] text-muted-foreground">
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
