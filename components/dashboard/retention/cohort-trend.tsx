"use client";

import { useMemo } from "react";
import type { RetentionInterval, RetentionResult } from "@/lib/analytics/retention";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const UNIT: Record<RetentionInterval, string> = { day: "days", week: "weeks", month: "months" };

function label(bucket: string, interval: RetentionInterval): string {
  const [y, m, d] = bucket.split("-").map(Number);
  return interval === "month" ? `${MONTHS[m - 1]} ${y}` : `${MONTHS[m - 1]} ${d}`;
}

// Deterministic hue per selected cohort so overlaid lines stay distinguishable.
const LINE_COLORS = ["var(--brand)", "#6366f1", "#f59e0b", "#ec4899", "#06b6d4", "#84cc16"];

/**
 * Overlaid cohort decay curves (docs/redesign/11): x = periods since first seen,
 * y = retention % (cohort basis). Answers "are newer cohorts retaining better".
 */
export function CohortTrend({
  result,
  selected,
}: {
  result: RetentionResult;
  selected: string[];
}) {
  const W = 620;
  const H = 200;
  const PAD = { l: 34, r: 12, t: 12, b: 24 };

  const series = useMemo(() => {
    return selected
      .map((bucket, i) => {
        const cohort = result.cohorts.find((c) => c.bucket === bucket);
        if (!cohort) return null;
        return {
          bucket,
          color: LINE_COLORS[i % LINE_COLORS.length],
          points: cohort.cells
            .filter((c) => !c.inProgress)
            .map((c) => ({ x: c.period, y: c.pct })),
        };
      })
      .filter((s): s is NonNullable<typeof s> => s != null && s.points.length > 0);
  }, [result, selected]);

  if (series.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-[12.5px] text-muted-foreground">
        Select cohort rows to overlay their retention curves.
      </div>
    );
  }

  const maxP = Math.max(1, result.maxPeriod);
  const px = (x: number) => PAD.l + (x / maxP) * (W - PAD.l - PAD.r);
  const py = (y: number) => PAD.t + (1 - y) * (H - PAD.t - PAD.b);

  return (
    <div className="w-full overflow-x-auto">
      <svg width={W} height={H} className="min-w-[520px]" style={{ fontFamily: "var(--font-jetbrains), monospace" }}>
        {/* Y gridlines at 0/25/50/75/100% */}
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <g key={g}>
            <line x1={PAD.l} x2={W - PAD.r} y1={py(g)} y2={py(g)} stroke="var(--border)" strokeWidth={1} />
            <text x={PAD.l - 6} y={py(g)} dy="0.32em" textAnchor="end" className="fill-muted-foreground" style={{ fontSize: 9 }}>
              {Math.round(g * 100)}
            </text>
          </g>
        ))}
        {/* X ticks */}
        {Array.from({ length: maxP + 1 }, (_, p) => (
          <text key={p} x={px(p)} y={H - 8} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 9 }}>
            {p}
          </text>
        ))}
        {series.map((s) => (
          <g key={s.bucket}>
            <path
              d={s.points.map((pt, i) => `${i === 0 ? "M" : "L"}${px(pt.x)},${py(pt.y)}`).join(" ")}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            {s.points.map((pt, i) => (
              <circle key={i} cx={px(pt.x)} cy={py(pt.y)} r={2.5} fill={s.color} />
            ))}
          </g>
        ))}
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 px-2">
        {series.map((s) => (
          <span key={s.bucket} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            {label(s.bucket, result.interval)}
          </span>
        ))}
        <span className="text-[11px] text-muted-foreground/60">x = {UNIT[result.interval]} since first seen</span>
      </div>
    </div>
  );
}
