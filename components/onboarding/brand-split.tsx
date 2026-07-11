import type { ReactNode } from "react";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { LogoGlyph } from "@/components/brand/Logo";

/**
 * Shared two-pane shell for first-run / gated surfaces (docs/redesign/17). The
 * left panel carries the landing page's emerald identity so the product feels
 * continuous with the promise; the right panel holds the active step. On mobile
 * the panel folds down to a slim branded header.
 */
export function BrandSplit({
  eyebrow,
  title,
  subtitle,
  ticks,
  footnote,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  ticks: string[];
  footnote?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-page md:grid md:grid-cols-[0.85fr_1fr] lg:grid-cols-[0.92fr_1.08fr]">
      {/* Desktop brand panel */}
      <aside className="relative hidden overflow-hidden bg-[#0B7E58] px-10 py-12 text-white md:flex md:flex-col md:justify-between lg:px-14">
        {/* Emerald depth + ambient glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(158deg, #0E9C6E 0%, #0B7E58 46%, #0A5E43 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute -left-20 -top-24 h-[420px] w-[420px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(180,244,214,.38), rgba(180,244,214,0) 62%)",
          }}
        />
        {/* Concentric globe rings, bottom-right */}
        <div className="pointer-events-none absolute -bottom-40 -right-40 h-[520px] w-[520px]">
          <div className="absolute inset-0 rounded-full border border-white/10" />
          <div className="absolute inset-[64px] rounded-full border border-white/10" />
          <div className="absolute inset-[128px] rounded-full border border-white/[0.08]" />
          <div className="absolute inset-[192px] rounded-full border border-white/[0.06]" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
            <LogoGlyph size={19} />
          </span>
          <span className="text-[18px] font-bold tracking-[-0.3px]">WebSight</span>
        </div>

        {/* Headline + ticks */}
        <div className="relative max-w-[340px]">
          <span className="text-[11.5px] font-bold uppercase tracking-[1.2px] text-white/60">
            {eyebrow}
          </span>
          <h2 className="mt-3 text-[30px] font-extrabold leading-[1.12] tracking-[-0.8px]">
            {title}
          </h2>
          <p className="mt-3 text-[14.5px] leading-[1.55] text-white/75">{subtitle}</p>
          <ul className="mt-7 space-y-2.5">
            {ticks.map((tick) => (
              <li key={tick} className="flex items-center gap-2.5 text-[13.5px] text-white/90">
                <CheckCircle size={17} weight="fill" className="shrink-0 text-white/80" />
                {tick}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-[12px] text-white/55">
          {footnote ?? "Privacy-first analytics for the modern web."}
        </div>
      </aside>

      {/* Mobile brand header */}
      <div className="relative flex items-center gap-2.5 overflow-hidden bg-[#0B7E58] px-5 py-4 text-white md:hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(120deg, #0E9C6E, #0A5E43)" }}
        />
        <span className="relative flex h-7 w-7 items-center justify-center rounded-[8px] bg-white/15 ring-1 ring-white/25">
          <LogoGlyph size={17} />
        </span>
        <span className="relative text-[16px] font-bold tracking-[-0.3px]">WebSight</span>
      </div>

      {/* Right pane */}
      <main className="relative flex flex-col justify-center overflow-hidden px-5 py-10 sm:px-8">
        {/* Subtle emerald warmth so the pane is never flat */}
        <div
          className="pointer-events-none absolute -top-24 right-0 h-[380px] w-[380px]"
          style={{
            background:
              "radial-gradient(circle, rgba(14,156,110,.07), rgba(14,156,110,0) 62%)",
          }}
        />
        <div className="relative mx-auto w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
