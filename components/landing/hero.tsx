import Link from "next/link";
import {
  ArrowRight,
  PlayCircle,
  CheckCircle,
  ChartLine,
  Broadcast,
  GlobeHemisphereWest,
  FileText,
  ArrowBendDownRight,
  UsersThree,
  Target,
  ListBullets,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react/dist/lib/types";

// ─── Mockup data (mirrors the real Overview screen) ────────────────────────────

const navItems: { Icon: PhosphorIcon; label: string; active?: boolean }[] = [
  { Icon: ChartLine, label: "Overview", active: true },
  { Icon: Broadcast, label: "Realtime" },
  { Icon: GlobeHemisphereWest, label: "Globe" },
  { Icon: FileText, label: "Pages" },
  { Icon: ArrowBendDownRight, label: "Sources" },
  { Icon: UsersThree, label: "Audience" },
  { Icon: Target, label: "Events" },
  { Icon: ListBullets, label: "Sessions" },
];

const metrics = [
  { label: "Unique Visitors", value: "24.8k", delta: "+12.4%", good: true },
  { label: "Sessions", value: "31.2k", delta: "+9.7%", good: true },
  { label: "Page Views", value: "68.2k", delta: "+8.1%", good: true },
  { label: "Views / Session", value: "2.18", delta: "+3.2%", good: true },
  { label: "Bounce Rate", value: "38%", delta: "-2.3%", good: true },
  { label: "Avg. Duration", value: "2m41s", delta: "+5.6%", good: true },
];

const topPages = [
  { label: "/", value: "12.4k", pct: 100 },
  { label: "/blog/ship-fast", value: "8.1k", pct: 66 },
  { label: "/pricing", value: "5.3k", pct: 43 },
  { label: "/docs/quickstart", value: "3.9k", pct: 31 },
];

const topSources = [
  { label: "Direct", value: "14.2k", pct: 100 },
  { label: "Search", value: "9.8k", pct: 69 },
  { label: "Social", value: "6.1k", pct: 43 },
  { label: "Referral", value: "2.7k", pct: 19 },
];

const rangeTabs = ["24h", "7d", "30d", "90d"];

const trustTicks = ["No credit card", "10k events free", "Self-host option"];

function BreakdownRows({ title, rows }: { title: string; rows: typeof topPages }) {
  return (
    <div className="flex-1 min-w-0 bg-card border border-border rounded-[13px] p-[14px_15px]">
      <div className="text-[12.5px] font-semibold mb-[11px] text-foreground">{title}</div>
      <div className="flex flex-col gap-[9px]">
        {rows.map((r) => (
          <div key={r.label} className="relative flex items-center justify-between">
            <span
              aria-hidden="true"
              className="absolute inset-y-[-3px] left-[-4px] rounded-[5px] bg-brand/[0.09]"
              style={{ width: `calc(${r.pct}% + 4px)` }}
            />
            <span className="relative truncate text-[12px] text-muted-foreground pr-2">{r.label}</span>
            <span className="relative font-mono text-[12px] font-medium text-foreground tabular-nums">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative bg-gradient-to-b from-brand/[0.05] to-transparent overflow-hidden">
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
          className="inline-flex items-center gap-[9px] bg-card border border-border shadow-[0_1px_3px_rgba(16,24,40,.05)] px-[14px] pl-2 py-[6px] rounded-3xl mb-[26px]"
        >
          <span className="inline-flex items-center gap-[5px] bg-accent text-accent-foreground text-[11.5px] font-bold px-[9px] py-[3px] rounded-[18px]">
            <span
              className="w-[6px] h-[6px] rounded-full bg-brand"
              style={{ animation: "wsBlink 1.4s ease-in-out infinite" }}
            />
            OPEN SOURCE
          </span>
          <span className="text-[13px] text-muted-foreground">
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
        <p className="text-[20px] leading-[1.55] text-muted-foreground max-w-[620px] mx-auto mb-8 [text-wrap:pretty]">
          The open-source Google Analytics alternative. Realtime data, a live
          visitor globe, session replays, and a script under 1KB — without the
          creepy tracking.
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

          <Link href="#globe">
            <Button
              size="lg"
              variant="outline"
              className="bg-card border-border text-foreground font-semibold text-[16px] px-[22px] py-[13px] rounded-xl hover:border-brand hover:text-brand gap-2 h-auto"
            >
              <PlayCircle size={18} />
              See it live
            </Button>
          </Link>
        </div>

        {/* Trust ticks */}
        <div className="flex items-center justify-center gap-[18px] text-[13px] text-muted-foreground/80">
          {trustTicks.map((tick) => (
            <span key={tick} className="inline-flex items-center gap-[6px]">
              <CheckCircle size={15} weight="fill" className="text-brand" />
              {tick}
            </span>
          ))}
        </div>
      </div>

      {/* ── Product visual (resembles the real Overview screen) ── */}
      <div className="relative max-w-[1060px] mx-auto mt-[50px] px-7">
        <div className="bg-card border border-border rounded-[18px_18px_0_0] shadow-[0_24px_60px_-20px_rgba(16,24,40,.28)] overflow-hidden">

          {/* Browser chrome */}
          <div className="flex items-center gap-2 px-[18px] py-[13px] border-b border-border/60 bg-card">
            <span className="w-[11px] h-[11px] rounded-full bg-border" />
            <span className="w-[11px] h-[11px] rounded-full bg-border" />
            <span className="w-[11px] h-[11px] rounded-full bg-border" />
            <div className="flex-1 flex justify-center">
              <div className="flex items-center gap-[7px] bg-secondary rounded-[7px] px-[14px] py-[5px] text-[12px] text-muted-foreground/80">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 256 256" aria-hidden="true">
                  <path fill="currentColor" d="M216 40H40a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16Zm-96 144a56 56 0 1 1 56-56 56.06 56.06 0 0 1-56 56Z" opacity=".2"/><path fill="currentColor" d="M216 32H40a24 24 0 0 0-24 24v144a24 24 0 0 0 24 24h176a24 24 0 0 0 24-24V56a24 24 0 0 0-24-24Zm8 168a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8V56a8 8 0 0 1 8-8h176a8 8 0 0 1 8 8Z"/>
                </svg>
                websight.srexrg.me
              </div>
            </div>
          </div>

          {/* App content */}
          <div className="flex bg-background">

            {/* Sidebar */}
            <div className="w-[188px] shrink-0 bg-card border-r border-border px-3 py-4 flex flex-col gap-[2px]">
              {/* Site switcher */}
              <div className="flex items-center gap-[9px] px-[9px] py-[7px] mb-2 rounded-lg border border-border">
                <span className="w-[18px] h-[18px] rounded-[6px] bg-brand shrink-0" />
                <span className="text-[12px] font-semibold text-foreground truncate">srexrg.me</span>
              </div>
              {navItems.map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-[9px] px-[9px] py-[6.5px] rounded-lg ${
                    item.active ? "bg-accent" : "bg-transparent"
                  }`}
                >
                  <item.Icon
                    size={14}
                    weight={item.active ? "fill" : "regular"}
                    className={item.active ? "text-accent-foreground" : "text-muted-foreground"}
                  />
                  <span
                    className={`text-[12px] ${
                      item.active ? "font-semibold text-accent-foreground" : "font-medium text-muted-foreground"
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Main content area */}
            <div className="flex-1 min-w-0 p-[16px_18px] flex flex-col gap-[12px]">

              {/* Topbar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-[11px]">
                  <span className="text-[15px] font-bold tracking-[-0.4px] text-foreground">Overview</span>
                  <span className="inline-flex items-center gap-[5px] text-[11px] font-semibold text-brand">
                    <span
                      className="w-[6px] h-[6px] rounded-full bg-brand"
                      style={{ animation: "wsBlink 1.4s ease-in-out infinite" }}
                    />
                    327 online
                  </span>
                </div>
                <div className="flex items-center gap-[2px] bg-card border border-border rounded-[9px] p-[2px]">
                  {rangeTabs.map((t) => (
                    <span
                      key={t}
                      className={`font-mono text-[11px] font-semibold px-[9px] py-[3px] rounded-[7px] ${
                        t === "7d" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* 6 metric cards */}
              <div className="grid grid-cols-6 gap-[9px]">
                {metrics.map((m) => (
                  <div key={m.label} className="bg-card border border-border rounded-[11px] p-[10px_11px]">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[9.5px] text-muted-foreground truncate">{m.label}</span>
                      <span
                        className={`font-mono text-[8.5px] font-semibold px-[4px] py-[1px] rounded-full ${
                          m.good ? "bg-accent text-success" : "bg-danger/10 text-danger"
                        }`}
                      >
                        {m.delta}
                      </span>
                    </div>
                    <div className="font-mono text-[17px] font-semibold tracking-[-0.7px] mt-[4px] text-foreground">
                      {m.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Visitors chart */}
              <div className="bg-card border border-border rounded-[13px] p-[15px_16px]">
                <div className="flex items-baseline gap-[9px] mb-[10px]">
                  <span className="text-[12.5px] font-semibold text-foreground">Unique Visitors</span>
                  <span className="font-mono text-[13px] font-semibold text-foreground">24.8k</span>
                  <span className="font-mono text-[10.5px] font-semibold text-success">+12.4%</span>
                </div>
                <svg
                  viewBox="0 0 520 150"
                  preserveAspectRatio="none"
                  className="w-full"
                  style={{ height: "112px", display: "block" }}
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

              {/* Breakdown row: Pages + Sources */}
              <div className="flex gap-[12px]">
                <BreakdownRows title="Pages" rows={topPages} />
                <BreakdownRows title="Sources" rows={topSources} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
