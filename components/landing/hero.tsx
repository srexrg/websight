import Link from "next/link";
import { ArrowRight, PlayCircle, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import Globe from "@/components/landing/Globe";

// ─── Local data (mirrored from design's heroMetrics + miniNav) ─────────────────

const miniNav = [
  { icon: "ph ph-chart-line",              label: "Overview",  active: false },
  { icon: "ph ph-broadcast",               label: "Realtime",  active: false },
  { icon: "ph ph-globe-hemisphere-west",   label: "Globe",     active: true  },
  { icon: "ph ph-file-text",               label: "Pages",     active: false },
  { icon: "ph ph-users-three",             label: "Audience",  active: false },
  { icon: "ph ph-gear-six",                label: "Settings",  active: false },
];

const heroMetrics = [
  { label: "Visitors", value: "24.8k", delta: "↑ 12.4%" },
  { label: "Views",    value: "68.2k", delta: "↑ 8.1%"  },
  { label: "Bounce",   value: "38%",   delta: "↓ 2.3%"  },
  { label: "Avg.",     value: "2m41s", delta: "↑ 5.6%"  },
];

// Small dots for the mini globe (subset of the full Globe's DEFAULT_DOTS)
const miniDots = [
  { top: "32%", left: "30%", delay: "0s"  },
  { top: "26%", left: "56%", delay: ".5s" },
  { top: "46%", left: "68%", delay: "1s"  },
  { top: "58%", left: "42%", delay: ".3s" },
  { top: "36%", left: "80%", delay: ".8s" },
];

const trustTicks = [
  "No credit card",
  "10k events free",
  "Self-host option",
];

export default function Hero() {
  return (
    <section className="relative bg-gradient-to-b from-[#F6FBF9] to-white overflow-hidden">
      {/* Radial emerald glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[780px] h-[780px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(14,156,110,.10), rgba(14,156,110,0) 60%)",
        }}
      />

      {/* ── Copy block ── */}
      <div className="relative max-w-[1000px] mx-auto px-7 pt-[78px] pb-0 text-center">

        {/* OPEN SOURCE pill */}
        <Link
          href="/auth"
          className="inline-flex items-center gap-[9px] bg-white border border-[#E4EEEA] shadow-[0_1px_3px_rgba(16,24,40,.05)] px-[14px] pl-2 py-[6px] rounded-3xl mb-[26px]"
        >
          <span className="inline-flex items-center gap-[5px] bg-accent text-[#0B7E58] text-[11.5px] font-bold px-[9px] py-[3px] rounded-[18px]">
            {/* blinking dot */}
            <span
              className="w-[6px] h-[6px] rounded-full bg-brand"
              style={{ animation: "wsBlink 1.4s ease-in-out infinite" }}
            />
            OPEN SOURCE
          </span>
          <span className="text-[13px] text-[#5A5D69]">
            Privacy-first, no cookies, GDPR-ready
          </span>
        </Link>

        {/* Headline */}
        <h1 className="text-[66px] font-extrabold tracking-[-2.4px] leading-[1.02] m-0 mb-[22px] text-foreground [text-wrap:balance]">
          Web analytics
          <br />
          that respects your{" "}
          <span className="text-brand">visitors</span>
        </h1>

        {/* Subhead */}
        <p className="text-[20px] leading-[1.55] text-[#5A5D69] max-w-[600px] mx-auto mb-8 [text-wrap:pretty]">
          A lightweight, beautiful analytics dashboard for indie hackers.
          Realtime data, a live visitor globe, and a script under 1KB —
          without the creepy tracking.
        </p>

        {/* CTAs */}
        <div className="flex items-center justify-center gap-[13px] mb-[18px]">
          <Link href="/auth">
            <Button
              size="lg"
              className="bg-brand text-white font-semibold text-[16px] px-6 py-[13px] rounded-xl shadow-[0_4px_14px_rgba(14,156,110,.34)] hover:bg-[#0B855E] gap-2 h-auto"
            >
              Start tracking free
              <ArrowRight size={16} weight="bold" />
            </Button>
          </Link>

          <Link href="/auth">
            <Button
              size="lg"
              variant="outline"
              className="bg-white border-border text-foreground font-semibold text-[16px] px-[22px] py-[13px] rounded-xl hover:border-brand hover:text-brand gap-2 h-auto"
            >
              <PlayCircle size={18} />
              Live demo
            </Button>
          </Link>
        </div>

        {/* Trust ticks */}
        <div className="flex items-center justify-center gap-[18px] text-[13px] text-[#9A9DA8]">
          {trustTicks.map((tick) => (
            <span key={tick} className="inline-flex items-center gap-[6px]">
              <CheckCircle size={15} weight="fill" className="text-brand" />
              {tick}
            </span>
          ))}
        </div>
      </div>

      {/* ── Product visual ── */}
      <div className="relative max-w-[1060px] mx-auto mt-[50px] px-7">
        {/* Browser card */}
        <div className="bg-white border border-[#E7E9EF] rounded-[18px_18px_0_0] shadow-[0_-1px_0_#fff,0_24px_60px_-20px_rgba(16,24,40,.28)] overflow-hidden">

          {/* Browser chrome */}
          <div className="flex items-center gap-2 px-[18px] py-[13px] border-b border-[#F1F2F5] bg-[#FCFCFD]">
            <span className="w-[11px] h-[11px] rounded-full bg-[#E5E6EA]" />
            <span className="w-[11px] h-[11px] rounded-full bg-[#E5E6EA]" />
            <span className="w-[11px] h-[11px] rounded-full bg-[#E5E6EA]" />
            <div className="flex-1 flex justify-center">
              <div className="flex items-center gap-[7px] bg-[#F1F2F5] rounded-[7px] px-[14px] py-[5px] text-[12px] text-[#9A9DA8]">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 256 256" aria-hidden="true">
                  <path fill="currentColor" d="M216 40H40a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16Zm-96 144a56 56 0 1 1 56-56 56.06 56.06 0 0 1-56 56Z" opacity=".2"/><path fill="currentColor" d="M216 32H40a24 24 0 0 0-24 24v144a24 24 0 0 0 24 24h176a24 24 0 0 0 24-24V56a24 24 0 0 0-24-24Zm8 168a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8V56a8 8 0 0 1 8-8h176a8 8 0 0 1 8 8Zm-56-96a8 8 0 0 1-8 8h-24v24a8 8 0 0 1-16 0v-24H96a8 8 0 0 1 0-16h24V92a8 8 0 0 1 16 0v24h24a8 8 0 0 1 8 8Z"/>
                </svg>
                websight.io/srexrg.me
              </div>
            </div>
          </div>

          {/* App content */}
          <div className="flex bg-[#F6F7F9]">

            {/* Mini sidebar nav */}
            <div className="w-[180px] shrink-0 bg-white border-r border-border px-3 py-4 flex flex-col gap-[3px]">
              {miniNav.map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-[9px] px-[9px] py-[7px] rounded-lg ${
                    item.active ? "bg-accent" : "bg-transparent"
                  }`}
                >
                  <i
                    className={`${item.icon} text-[14px] ${
                      item.active ? "text-[#0B7E58]" : "text-muted-foreground"
                    }`}
                  />
                  <span
                    className={`text-[12px] ${
                      item.active
                        ? "font-semibold text-[#0B7E58]"
                        : "font-medium text-muted-foreground"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Main content area */}
            <div className="flex-1 min-w-0 p-[18px_20px] flex flex-col gap-[13px]">

              {/* 4 metric cards */}
              <div className="grid grid-cols-4 gap-[11px]">
                {heroMetrics.map((m) => (
                  <div
                    key={m.label}
                    className="bg-white border border-border rounded-[11px] p-[11px_12px]"
                  >
                    <div className="text-[11px] text-muted-foreground">{m.label}</div>
                    <div className="font-mono text-[19px] font-semibold tracking-[-0.6px] mt-[3px] text-foreground">
                      {m.value}
                    </div>
                    <div className="font-mono text-[10.5px] font-semibold text-brand mt-[1px]">
                      {m.delta}
                    </div>
                  </div>
                ))}
              </div>

              {/* Visitors chart + live globe panel */}
              <div className="flex gap-[13px]">

                {/* Area chart */}
                <div className="flex-1 bg-white border border-border rounded-[13px] p-[15px_16px]">
                  <div className="text-[12.5px] font-semibold mb-[10px] text-foreground">
                    Visitors
                  </div>
                  <svg
                    viewBox="0 0 520 150"
                    preserveAspectRatio="none"
                    className="w-full"
                    style={{ height: "120px", display: "block" }}
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#0E9C6E" stopOpacity=".18" />
                        <stop offset="1" stopColor="#0E9C6E" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0 118 C40 110 70 86 110 90 C150 94 175 62 215 58 C255 54 280 78 320 70 C360 62 385 30 425 26 C465 22 495 40 520 34 L520 150 L0 150 Z"
                      fill="url(#heroGrad)"
                    />
                    <path
                      d="M0 118 C40 110 70 86 110 90 C150 94 175 62 215 58 C255 54 280 78 320 70 C360 62 385 30 425 26 C465 22 495 40 520 34"
                      fill="none"
                      stroke="#0E9C6E"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                {/* Live globe panel */}
                <div className="w-[188px] shrink-0 bg-white border border-border rounded-[13px] p-[14px] flex flex-col items-center">
                  {/* LIVE label */}
                  <div className="self-start flex items-center gap-[5px] text-[11px] font-semibold text-brand">
                    <span
                      className="w-[6px] h-[6px] rounded-full bg-brand"
                      style={{ animation: "wsBlink 1.4s ease-in-out infinite" }}
                    />
                    LIVE · 327
                  </div>
                  {/* Mini Globe (size=120) */}
                  <div className="mt-[6px]">
                    <Globe size={120} dots={miniDots} />
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
