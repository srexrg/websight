"use client";

import { useDashboardParams, useGoalTimeseries } from "@/lib/dashboard/use-analytics";
import { Sk } from "@/components/dashboard/states";

/** Daily conversion bar chart for the goal detail page (docs/redesign/08 M3). */
export function GoalTrend({ site, goalId }: { site: string; goalId: string }) {
  const { params } = useDashboardParams();
  const q = useGoalTimeseries(site, params, goalId);

  if (q.isPending) return <Sk className="h-40 w-full" />;
  const pts = q.data ?? [];
  if (pts.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-[12.5px] text-muted-foreground">
        No conversions in range
      </div>
    );
  }

  const max = Math.max(...pts.map((p) => p.conversions), 1);
  const W = 100;
  const H = 40;
  const bw = W / pts.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-40 w-full">
      {pts.map((p, i) => {
        const bh = (p.conversions / max) * (H - 1);
        return (
          <rect
            key={i}
            x={i * bw + bw * 0.12}
            y={H - bh}
            width={bw * 0.76}
            height={bh}
            className="fill-brand"
          >
            <title>{`${p.bucket.slice(0, 10)}: ${p.conversions} conversions`}</title>
          </rect>
        );
      })}
    </svg>
  );
}
