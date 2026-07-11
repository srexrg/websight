import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { LogoMark } from "@/components/brand/Logo";

export const metadata = { title: "404 - Page not found" };

/**
 * Global 404. Leans on the product's own language: the traffic chart
 * flatlines, the page reports a 100% bounce rate, and the way out is a
 * breakdown card of "where traffic actually goes".
 */

const DESTINATIONS = [
  { href: "/", path: "/", label: "Home", pct: 100, value: "12.4k" },
  { href: "/docs", path: "/docs", label: "Docs", pct: 64, value: "7.9k" },
  { href: "/dashboard", path: "/dashboard", label: "Dashboard", pct: 46, value: "5.7k" },
];

function FlatlineChart() {
  return (
    <svg viewBox="0 0 360 96" className="w-full" aria-hidden>
      <defs>
        <linearGradient id="nf-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0E9C6E" stopOpacity=".16" />
          <stop offset="1" stopColor="#0E9C6E" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Healthy traffic... until it reaches this page. */}
      <path
        d="M0 64 C20 58 32 40 52 44 C72 48 84 26 104 24 C124 22 136 44 156 40 C170 37 180 30 190 28 L204 78 L360 78"
        fill="none"
        stroke="#0E9C6E"
        strokeWidth="2.4"
        strokeLinecap="round"
        className="text-brand"
      />
      <path
        d="M0 64 C20 58 32 40 52 44 C72 48 84 26 104 24 C124 22 136 44 156 40 C170 37 180 30 190 28 L204 78 L360 78 L360 96 L0 96 Z"
        fill="url(#nf-fill)"
      />
      {/* The moment you arrived */}
      <circle cx="358" cy="78" r="3.5" fill="#0E9C6E" style={{ animation: "wsBlink 1.4s ease-in-out infinite" }} />
    </svg>
  );
}

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-page px-6 py-16 text-foreground">
      <main className="w-full max-w-[420px]">
        <Link href="/" className="inline-flex items-center gap-2.5" aria-label="WebSight home">
          <LogoMark size={30} />
          <span className="text-[17px] font-bold tracking-[-0.3px]">WebSight</span>
        </Link>

        <p className="mt-9 font-mono text-[12px] font-semibold uppercase tracking-[1px] text-muted-foreground">
          Error 404 · page not found
        </p>
        <h1 className="mt-2.5 text-[32px] font-extrabold leading-[1.12] tracking-[-1px] [text-wrap:balance]">
          This page has a <span className="text-brand">100% bounce rate.</span>
        </h1>
        <p className="mt-3 text-[14.5px] leading-relaxed text-muted-foreground">
          Mostly because it doesn&apos;t exist. We logged your visit anyway: one lost
          visitor, zero page views, and a traffic chart that has seen better days.
        </p>

        <div className="mt-7 rounded-2xl border border-border bg-card px-[18px] pb-3 pt-4 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
          <FlatlineChart />

          <div className="mt-4 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold">Where traffic actually goes</h2>
            <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[.5px] text-muted-foreground/70">
              Visitors
            </span>
          </div>
          <ul className="mt-2">
            {DESTINATIONS.map((d) => (
              <li key={d.href} className="group/row">
                <Link href={d.href} className="flex w-full items-center gap-3 py-[3px]">
                  <span className="relative flex h-[28px] min-w-0 flex-1 items-center">
                    <span
                      className="absolute inset-y-0 left-0 rounded-[6px] bg-brand/[0.09] transition-colors group-hover/row:bg-brand/[0.16]"
                      style={{ width: `${d.pct}%` }}
                      aria-hidden
                    />
                    <span className="relative z-10 flex min-w-0 items-center gap-2 px-2 text-[13px]">
                      <span className="font-mono text-muted-foreground">{d.path}</span>
                      <span className="truncate font-medium">{d.label}</span>
                      <ArrowRight
                        size={12}
                        weight="bold"
                        className="text-brand opacity-0 transition-opacity group-hover/row:opacity-100"
                      />
                    </span>
                  </span>
                  <span className="w-12 shrink-0 text-right font-mono text-[12.5px] font-medium tabular-nums">
                    {d.value}
                  </span>
                </Link>
              </li>
            ))}
            <li className="group/row">
              <span className="flex w-full cursor-not-allowed items-center gap-3 py-[3px]" title="You are here.">
                <span className="relative flex h-[28px] min-w-0 flex-1 items-center">
                  <span
                    className="absolute inset-y-0 left-0 w-[2%] rounded-[6px] bg-danger/15"
                    aria-hidden
                  />
                  <span className="relative z-10 flex min-w-0 items-center gap-2 px-2 text-[13px] text-muted-foreground">
                    <span className="font-mono">this page</span>
                    <span className="truncate">you are here</span>
                  </span>
                </span>
                <span className="w-12 shrink-0 text-right font-mono text-[12.5px] font-medium tabular-nums text-danger">
                  1
                </span>
              </span>
            </li>
          </ul>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-[10px] bg-brand px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_2px_8px_rgba(14,156,110,.30)] transition-colors hover:bg-brand/90"
          >
            Back to safety
            <ArrowRight size={14} weight="bold" />
          </Link>
          <span className="flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[11px] font-semibold text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-danger [animation:wsBlink_1.4s_ease-in-out_infinite]" />
            1 lost visitor online now
          </span>
        </div>
      </main>
    </div>
  );
}
