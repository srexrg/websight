"use client";

import type { VitalMetric, VitalRating, VitalSummaryRow } from "@/lib/analytics/vitals";
import { VITAL_META, VITAL_METRICS, VITAL_MIN_SAMPLE, formatVital, thresholdLabel } from "@/lib/analytics/vitals";
import { formatNumber } from "@/lib/dashboard/format";

export const RATING_COLOR: Record<VitalRating, string> = {
  good: "var(--success)",
  ni: "#D9A441",
  poor: "var(--danger)",
};
const RATING_LABEL: Record<VitalRating, string> = { good: "Good", ni: "Needs work", poor: "Poor" };

/** Good/NI/Poor proportion bar (CrUX pattern). */
function DistBar({ good, ni, poor }: { good: number; ni: number; poor: number }) {
  const total = good + ni + poor || 1;
  const seg = (n: number, c: string) =>
    n > 0 ? <span style={{ width: `${(n / total) * 100}%`, background: c }} className="h-full" /> : null;
  return (
    <div className="mt-2.5 flex h-1.5 w-full overflow-hidden rounded-full bg-secondary">
      {seg(good, RATING_COLOR.good)}
      {seg(ni, RATING_COLOR.ni)}
      {seg(poor, RATING_COLOR.poor)}
    </div>
  );
}

export function MetricCards({
  summary,
  selected,
  onSelect,
}: {
  summary: VitalSummaryRow[];
  selected: VitalMetric;
  onSelect: (m: VitalMetric) => void;
}) {
  const byMetric = new Map(summary.map((r) => [r.metric, r]));

  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-5">
      {VITAL_METRICS.map((metric) => {
        const r = byMetric.get(metric);
        const meta = VITAL_META[metric];
        const enough = r && r.sample >= VITAL_MIN_SAMPLE && r.p75 != null;
        const isSel = selected === metric;
        return (
          <button
            key={metric}
            onClick={() => onSelect(metric)}
            title={meta.hint}
            className={`flex flex-col rounded-xl border bg-card p-3 text-left transition-colors ${
              isSel ? "border-brand ring-1 ring-brand" : "border-border hover:border-muted-foreground/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] font-semibold text-foreground">{meta.label}</span>
              {enough && r!.rating && (
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: RATING_COLOR[r!.rating] }} />
                  <span className="text-[10.5px] text-muted-foreground">{RATING_LABEL[r!.rating]}</span>
                </span>
              )}
            </div>
            {enough ? (
              <>
                <span className="mt-1.5 font-mono text-[22px] font-semibold text-foreground">
                  {formatVital(metric, r!.p75)}
                </span>
                <span className="text-[10.5px] text-muted-foreground">
                  p75 · {formatNumber(r!.sample)} samples
                </span>
                <DistBar good={r!.good} ni={r!.ni} poor={r!.poor} />
              </>
            ) : (
              <>
                <span className="mt-1.5 font-mono text-[15px] text-muted-foreground">
                  {r && r.sample > 0 ? "collecting…" : "no data"}
                </span>
                <span className="text-[10.5px] text-muted-foreground/70">
                  {r && r.sample > 0 ? `${formatNumber(r.sample)}/${VITAL_MIN_SAMPLE} samples` : "waiting for samples"}
                </span>
              </>
            )}
            <span className="mt-2 font-mono text-[10px] text-muted-foreground/60">{thresholdLabel(metric)}</span>
          </button>
        );
      })}
    </div>
  );
}
