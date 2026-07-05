"use client";

import { useDashboardParams, useFunnelTimeToConvert } from "@/lib/dashboard/use-analytics";
import { Sk } from "@/components/dashboard/states";

const LABELS = ["<1m", "1-5m", "5-30m", "30-60m", "1-6h", "6-24h", ">1d"];

/** Time-to-convert distribution histogram for a funnel's completers (09 M4). */
export function FunnelTimeToConvert({ site, funnelId }: { site: string; funnelId: string }) {
  const { params } = useDashboardParams();
  const q = useFunnelTimeToConvert(site, params, funnelId);

  if (q.isPending) return <Sk className="h-32 w-full" />;
  const data = q.data ?? [];
  const counts = LABELS.map((_, i) => data.find((d) => d.bucket === i)?.count ?? 0);
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) {
    return <p className="text-[12.5px] text-muted-foreground">No completed conversions in this range.</p>;
  }
  const max = Math.max(...counts, 1);

  return (
    <div className="flex items-end gap-2" style={{ height: 128 }}>
      {counts.map((c, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t bg-brand/70"
              style={{ height: `${Math.max((c / max) * 100, c > 0 ? 4 : 0)}%` }}
              title={`${c} completed in ${LABELS[i]}`}
            />
          </div>
          <span className="font-mono text-[10px] text-foreground">{c}</span>
          <span className="text-[9.5px] text-muted-foreground">{LABELS[i]}</span>
        </div>
      ))}
    </div>
  );
}
