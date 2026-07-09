"use client";

import { Sk } from "./states";

/**
 * Metric card per design-system.md: 12.5px label, big JetBrains Mono value,
 * optional delta chip (comparison arrives with plan 05) and sparkline.
 * Delta semantics: for lower-is-better metrics pass invertDelta (bounce rate).
 */
export function MetricCard({
  label,
  value,
  delta,
  invertDelta = false,
  sparkline,
  isLoading = false,
  active = false,
  onClick,
}: {
  label: string;
  value: string;
  delta?: number | null;
  invertDelta?: boolean;
  sparkline?: number[];
  isLoading?: boolean;
  active?: boolean;
  onClick?: () => void;
}) {
  const good = delta != null && (invertDelta ? delta < 0 : delta > 0);
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={`flex flex-col gap-1.5 rounded-2xl border bg-card p-[18px] text-left shadow-[0_1px_2px_rgba(16,24,40,.04)] transition-colors ${
        active ? "border-brand/40 ring-1 ring-brand/25" : "border-border"
      } ${onClick ? "cursor-pointer hover:bg-surface-2 dark:hover:bg-secondary/50" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-medium text-muted-foreground">{label}</span>
        {delta != null && (
          <span
            className={`rounded-full px-1.5 py-0.5 font-mono text-[11px] font-semibold ${
              good ? "bg-accent text-success" : "bg-danger/10 text-danger"
            }`}
          >
            {delta > 0 ? "+" : ""}
            {(delta * 100).toFixed(1)}%
          </span>
        )}
      </div>
      {isLoading ? (
        <Sk className="h-8 w-24" />
      ) : (
        <span className="font-mono text-[27px] font-semibold leading-none tracking-[-1px] text-foreground">
          {value}
        </span>
      )}
      {sparkline && sparkline.length > 1 && !isLoading && <Sparkline data={sparkline} />}
    </Comp>
  );
}

export function Sparkline({ data, className = "h-8 w-full" }: { data: number[]; className?: string }) {
  const max = Math.max(...data, 1);
  const w = 100;
  const h = 28;
  const step = w / (data.length - 1);
  const points = data.map((v, i) => `${(i * step).toFixed(2)},${(h - (v / max) * (h - 4) - 2).toFixed(2)}`);
  const line = `M${points.join(" L")}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className} aria-hidden>
      <path
        d={`${line} L${w},${h} L0,${h} Z`}
        fill="var(--brand)"
        opacity="0.08"
        stroke="none"
      />
      <path d={line} fill="none" stroke="var(--brand)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
