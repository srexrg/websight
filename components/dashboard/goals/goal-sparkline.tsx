"use client";

import { useDashboardParams, useGoalTimeseries } from "@/lib/dashboard/use-analytics";

/** Tiny inline conversion sparkline for a goal row (docs/redesign/08 M2). */
export function GoalSparkline({ site, goalId }: { site: string; goalId: string }) {
  const { params } = useDashboardParams();
  const q = useGoalTimeseries(site, params, goalId);

  if (q.isPending) return <div className="h-6 w-24 animate-pulse rounded bg-secondary" />;
  const vals = (q.data ?? []).map((p) => p.conversions);
  if (vals.length === 0) return <div className="h-6 w-24" aria-hidden />;

  const w = 96;
  const h = 24;
  const max = Math.max(...vals, 1);
  const step = vals.length > 1 ? w / (vals.length - 1) : 0;
  const d = vals
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - (v / max) * (h - 2) - 1).toFixed(1)}`)
    .join(" ");

  return (
    <svg width={w} height={h} className="text-brand" aria-hidden>
      {vals.length === 1 ? (
        <circle cx={w / 2} cy={h / 2} r="2" fill="currentColor" />
      ) : (
        <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      )}
    </svg>
  );
}
