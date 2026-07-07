"use client";

import { useState } from "react";
import type { AnalyticsParams } from "@/lib/dashboard/use-analytics";
import { useVitalsAttribution } from "@/lib/dashboard/use-analytics";
import type { VitalMetric, VitalPageRow } from "@/lib/analytics/vitals";
import { VITAL_META, VITAL_METRICS, formatVital, ratingOf } from "@/lib/analytics/vitals";
import { RATING_COLOR } from "./metric-cards";
import { formatNumber } from "@/lib/dashboard/format";
import { Sk } from "@/components/dashboard/states";

const COL_KEY: Record<VitalMetric, keyof VitalPageRow> = {
  LCP: "lcp", INP: "inp", CLS: "cls", FCP: "fcp", TTFB: "ttfb",
};

/** A p75 value as a colored rating dot + number. */
function RatingCell({ metric, value }: { metric: VitalMetric; value: number | null }) {
  const rating = ratingOf(metric, value);
  return (
    <span className="inline-flex items-center justify-end gap-1.5 font-mono text-[12px] text-foreground">
      {rating && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: RATING_COLOR[rating] }} />}
      {formatVital(metric, value)}
    </span>
  );
}

/** Attribution: top elements on non-good loads for the selected path + metric. */
function AttributionPanel({
  site,
  params,
  path,
  metric,
  onClose,
}: {
  site: string;
  params: AnalyticsParams;
  path: string;
  metric: VitalMetric;
  onClose: () => void;
}) {
  const q = useVitalsAttribution(site, params, path, metric);
  const total = (q.data ?? []).reduce((s, r) => s + r.count, 0) || 1;

  return (
    <div className="mt-3 rounded-xl border border-border bg-secondary/40 p-3">
      <div className="flex items-center justify-between">
        <h4 className="truncate text-[12.5px] font-semibold text-foreground">
          {VITAL_META[metric].label} attribution · <span className="font-mono text-muted-foreground">{path}</span>
        </h4>
        <button onClick={onClose} className="rounded p-0.5 text-muted-foreground hover:text-foreground" aria-label="Close">
          <span className="text-[15px] leading-none">&times;</span>
        </button>
      </div>
      {q.isPending ? (
        <div className="mt-2 space-y-1"><Sk className="h-6 w-full" /><Sk className="h-6 w-2/3" /></div>
      ) : (q.data?.length ?? 0) === 0 ? (
        <p className="mt-2 text-[12px] text-muted-foreground">
          No attributed elements (either no slow loads, or this metric carries no element).
        </p>
      ) : (
        <ul className="mt-2 space-y-1">
          {q.data!.map((r) => (
            <li key={r.element} className="flex items-center justify-between gap-3 text-[12px]">
              <code className="min-w-0 flex-1 truncate font-mono text-foreground">{r.element}</code>
              <span className="shrink-0 font-mono text-muted-foreground">
                {Math.round((r.count / total) * 100)}% of slow · {formatVital(metric, r.p75)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type SortKey = VitalMetric | "samples";

function SortTh({ label, k, sort, setSort }: { label: string; k: SortKey; sort: SortKey; setSort: (k: SortKey) => void }) {
  return (
    <button
      onClick={() => setSort(k)}
      className={`w-full text-right font-mono text-[11px] ${sort === k ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
    >
      {label}
    </button>
  );
}

export function VitalsPagesTable({
  site,
  params,
  rows,
}: {
  site: string;
  params: AnalyticsParams;
  rows: VitalPageRow[];
}) {
  const [sort, setSort] = useState<SortKey>("samples");
  const [sel, setSel] = useState<{ path: string; metric: VitalMetric } | null>(null);

  const sorted = [...rows].sort((a, b) => {
    if (sort === "samples") return b.samples - a.samples;
    const key = COL_KEY[sort];
    return (Number(b[key] ?? -1)) - (Number(a[key] ?? -1));
  });

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="py-1.5 pr-2 text-left text-[11px] font-medium text-muted-foreground">Page</th>
              {VITAL_METRICS.map((m) => (
                <th key={m} className="px-2 py-1.5"><SortTh label={m} k={m} sort={sort} setSort={setSort} /></th>
              ))}
              <th className="py-1.5 pl-2"><SortTh label="Samples" k="samples" sort={sort} setSort={setSort} /></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.path} className="border-b border-border/50 last:border-0 hover:bg-secondary/40">
                <td className="max-w-[220px] truncate py-1.5 pr-2 font-mono text-[12px] text-foreground">{r.path}</td>
                {VITAL_METRICS.map((m) => {
                  const value = r[COL_KEY[m]] as number | null;
                  const clickable = m !== "TTFB" && m !== "FCP" && value != null;
                  return (
                    <td key={m} className="px-2 py-1.5 text-right">
                      <button
                        disabled={!clickable}
                        onClick={() => setSel({ path: r.path, metric: m })}
                        className={clickable ? "cursor-pointer hover:underline" : "cursor-default"}
                        title={clickable ? "See attributed elements" : undefined}
                      >
                        <RatingCell metric={m} value={value} />
                      </button>
                    </td>
                  );
                })}
                <td className="py-1.5 pl-2 text-right font-mono text-[12px] text-muted-foreground">{formatNumber(r.samples)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sel && (
        <AttributionPanel site={site} params={params} path={sel.path} metric={sel.metric} onClose={() => setSel(null)} />
      )}
    </div>
  );
}
