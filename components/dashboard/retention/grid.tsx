"use client";

import type { RetentionCell, RetentionInterval, RetentionResult } from "@/lib/analytics/retention";
import { formatNumber } from "@/lib/dashboard/format";

const UNIT_LABEL: Record<RetentionInterval, string> = { day: "days", week: "weeks", month: "months" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Human label for a 'YYYY-MM-DD' bucket start given the interval. */
function bucketLabel(bucket: string, interval: RetentionInterval): string {
  const [y, m, d] = bucket.split("-").map(Number);
  if (interval === "month") return `${MONTHS[m - 1]} ${y}`;
  return `${MONTHS[m - 1]} ${d}`;
}

/** Selected cell coordinates (for drill-down highlight). */
export type CellCoord = { cohort: string; period: number };

export function RetentionGrid({
  result,
  selected,
  onCellClick,
  trendSelected,
  onCohortToggle,
}: {
  result: RetentionResult;
  selected: CellCoord | null;
  onCellClick?: (cohort: string, cell: RetentionCell) => void;
  /** Cohorts currently overlaid in the trend chart. */
  trendSelected?: Set<string>;
  onCohortToggle?: (cohort: string) => void;
}) {
  const { cohorts, weightedAvg, maxPeriod, interval } = result;

  // Per-grid normalization: brightest non-period-0 cell = full intensity, so
  // low-retention sites still show relative structure.
  let peak = 0;
  for (const c of cohorts) {
    for (const cell of c.cells) {
      if (cell.period > 0 && !cell.inProgress) peak = Math.max(peak, cell.pct);
    }
  }
  const intensity = (cell: RetentionCell) =>
    cell.period === 0 ? 1 : peak > 0 ? Math.min(cell.pct / peak, 1) : 0;

  const cols = `minmax(104px,1.2fr) 64px repeat(${maxPeriod + 1}, minmax(46px,1fr))`;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max" style={{ display: "grid", gridTemplateColumns: cols }}>
        {/* Header */}
        <div className="sticky left-0 z-10 bg-card px-2 pb-1.5 text-[11px] font-medium text-muted-foreground">
          Cohort
        </div>
        <div className="pb-1.5 text-right text-[11px] font-medium text-muted-foreground">Users</div>
        {Array.from({ length: maxPeriod + 1 }, (_, p) => (
          <div key={p} className="pb-1.5 text-center font-mono text-[11px] text-muted-foreground">
            {p}
          </div>
        ))}

        {/* Weighted average row */}
        <div className="sticky left-0 z-10 flex items-center bg-card px-2 py-1 text-[12px] font-semibold text-foreground">
          Average
        </div>
        <div className="flex items-center justify-end py-1 font-mono text-[12px] text-muted-foreground">
          {formatNumber(result.totalVisitors)}
        </div>
        {Array.from({ length: maxPeriod + 1 }, (_, p) => {
          const v = weightedAvg[p];
          return (
            <div
              key={p}
              className="m-[1px] flex items-center justify-center rounded-[3px] py-1 font-mono text-[11.5px]"
              style={{
                background:
                  v == null
                    ? "transparent"
                    : `color-mix(in oklab, var(--brand) ${Math.round((p === 0 ? 1 : peak > 0 ? Math.min(v / peak, 1) : 0) * 82 + 8)}%, transparent)`,
                color:
                  v != null && (p === 0 ? 1 : peak > 0 ? v / peak : 0) > 0.55
                    ? "var(--brand-foreground)"
                    : "var(--foreground)",
              }}
              title={v == null ? "No complete data yet" : `${Math.round(v * 100)}% average`}
            >
              {v == null ? "" : `${Math.round(v * 100)}%`}
            </div>
          );
        })}

        {/* Cohort rows */}
        {cohorts.map((cohort) => (
          <div key={cohort.bucket} className="contents">
            <button
              type="button"
              onClick={() => onCohortToggle?.(cohort.bucket)}
              className={`sticky left-0 z-10 flex items-center gap-1.5 bg-card px-2 py-1 text-left text-[12px] transition-colors ${
                onCohortToggle ? "cursor-pointer hover:text-brand" : ""
              } ${trendSelected?.has(cohort.bucket) ? "font-semibold text-brand" : "text-foreground"}`}
              title={onCohortToggle ? "Toggle this cohort in the trend chart" : undefined}
            >
              {trendSelected?.has(cohort.bucket) && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
              )}
              {bucketLabel(cohort.bucket, interval)}
            </button>
            <div className="flex items-center justify-end py-1 font-mono text-[12px] text-muted-foreground">
              {formatNumber(cohort.size)}
              {cohort.lowSample && <span className="ml-1 text-[10px] text-muted-foreground/70">•</span>}
            </div>
            {Array.from({ length: maxPeriod + 1 }, (_, p) => {
              const cell = cohort.cells[p];
              if (!cell) return <div key={p} />;
              const t = intensity(cell);
              const isSel = selected?.cohort === cohort.bucket && selected?.period === p;
              const clickable = !!onCellClick && cell.returned > 0;
              return (
                <button
                  key={p}
                  type="button"
                  disabled={!clickable}
                  onClick={() => clickable && onCellClick!(cohort.bucket, cell)}
                  title={`${bucketLabel(cohort.bucket, interval)} · ${UNIT_LABEL[interval]} +${p}${
                    cell.inProgress ? " (in progress)" : ""
                  }\n${Math.round(cell.pct * 100)}% — ${formatNumber(cell.returned)} of ${formatNumber(
                    cohort.size,
                  )}${cohort.lowSample ? "\nLow sample: percentages are noisy" : ""}`}
                  className={`group relative m-[1px] flex items-center justify-center rounded-[3px] py-1 font-mono text-[11.5px] transition-[outline] ${
                    clickable ? "cursor-pointer" : "cursor-default"
                  } ${isSel ? "outline outline-2 outline-brand" : ""} ${
                    cell.inProgress ? "border border-dashed border-border" : ""
                  }`}
                  style={{
                    background: cohort.lowSample
                      ? `repeating-linear-gradient(45deg, color-mix(in oklab, var(--brand) ${Math.round(
                          t * 60 + 6,
                        )}%, transparent) 0 3px, transparent 3px 6px)`
                      : `color-mix(in oklab, var(--brand) ${Math.round(t * 82 + 8)}%, transparent)`,
                    color: t > 0.55 && !cohort.lowSample ? "var(--brand-foreground)" : "var(--foreground)",
                    opacity: cell.inProgress ? 0.6 : 1,
                  }}
                >
                  {Math.round(cell.pct * 100)}%
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
