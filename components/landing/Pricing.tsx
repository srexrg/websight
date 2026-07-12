import Link from "next/link";
import { ArrowRight, Check } from "@phosphor-icons/react/dist/ssr";

const included: string[] = [
  "Realtime dashboard",
  "Live visitor globe",
  "Session replay",
  "Events, goals & funnels",
  "Core Web Vitals",
  "Filters & segments",
  "Public share links",
  "Self-host, MIT licensed",
];

export default function Pricing() {
  return (
    <section id="pricing">
      <div className="max-w-[1180px] mx-auto px-7 pt-[92px] pb-[92px]">
        {/* Section header */}
        <div className="text-center max-w-[660px] mx-auto mb-[44px]">
          <span className="text-[13px] font-bold tracking-[0.6px] text-brand uppercase">
            PRICING
          </span>
          <h2 className="text-[44px] font-extrabold tracking-[-1.4px] leading-[1.08] mt-3 mb-4 text-foreground">
            Free, and open source
          </h2>
          <p className="text-[18px] leading-[1.55] text-muted-foreground m-0">
            Use it free on the hosted app, or self-host the whole thing. Every
            feature is included, the code is MIT licensed, and there is no credit
            card to reach for.
          </p>
        </div>

        {/* Single honest panel */}
        <div className="max-w-[760px] mx-auto rounded-[24px] border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)] overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-stretch">
            {/* Left: the promise */}
            <div className="md:w-[46%] p-8 md:p-10 md:border-r border-b md:border-b-0 border-border">
              <span className="inline-flex items-center rounded-full bg-brand/10 px-3 py-1 text-[12px] font-bold tracking-[0.4px] text-brand uppercase">
                Everything, for everyone
              </span>
              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="font-mono text-[52px] font-bold tracking-[-1.5px] leading-none text-foreground">
                  $0
                </span>
                <span className="text-[15px] text-muted-foreground">/ forever</span>
              </div>
              <p className="mt-4 text-[14.5px] leading-[1.55] text-muted-foreground">
                No plan tiers to compare, no feature held back. Bring as many
                sites as you reasonably need.
              </p>

              <div className="mt-8 flex flex-col gap-3">
                <Link
                  href="/auth"
                  className="flex items-center justify-center gap-2 bg-brand text-white text-[15px] font-semibold rounded-[12px] py-[13px] px-5 shadow-[0_6px_20px_rgba(14,156,110,0.28)] hover:bg-brand/90 transition-colors"
                >
                  Start free
                  <ArrowRight size={16} weight="bold" />
                </Link>
                <Link
                  href="/docs/resources/self-hosting"
                  className="flex items-center justify-center gap-2 bg-card text-foreground border border-border text-[15px] font-semibold rounded-[12px] py-[13px] px-5 hover:border-brand/40 hover:shadow-sm transition-all"
                >
                  Self-host guide
                </Link>
              </div>
            </div>

            {/* Right: what you actually get */}
            <div className="md:w-[54%] p-8 md:p-10">
              <p className="text-[13px] font-bold tracking-[0.5px] text-muted-foreground uppercase mb-5">
                What&apos;s included
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-[13px]">
                {included.map((item) => (
                  <li key={item} className="flex items-center gap-[10px]">
                    <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-brand/10">
                      <Check size={12} weight="bold" className="text-brand" />
                    </span>
                    <span className="text-[14px] text-foreground/85">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Future note, framed as future, not buyable */}
        <p className="mt-7 text-center text-[13.5px] text-muted-foreground">
          Hosted paid plans may arrive as the project grows. Self-hosting stays
          free, forever.
        </p>
      </div>
    </section>
  );
}
