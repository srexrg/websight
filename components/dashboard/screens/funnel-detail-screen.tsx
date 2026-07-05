"use client";

import Link from "next/link";
import { useDashboardParams, useFunnelResults } from "@/lib/dashboard/use-analytics";
import { stepLabel } from "@/lib/analytics/funnels";
import { formatDuration, formatNumber } from "@/lib/dashboard/format";
import { EmptyState, Sk } from "@/components/dashboard/states";

export function FunnelDetailScreen({ site, funnelId }: { site: string; funnelId: string }) {
  const { params } = useDashboardParams();
  const q = useFunnelResults(site, params, funnelId);

  const back = (
    <Link href={`/${site}/funnels`} className="text-[12.5px] text-muted-foreground hover:text-foreground">
      &larr; All funnels
    </Link>
  );

  if (q.isPending) {
    return (
      <div className="space-y-4">
        {back}
        <Sk className="h-72 w-full rounded-2xl" />
      </div>
    );
  }
  if (q.isError || !q.data) {
    return (
      <div className="space-y-4">
        {back}
        <EmptyState title="Funnel not found" hint="It may have been archived." />
      </div>
    );
  }

  const { name, steps, results } = q.data;
  const first = results[0]?.visitors ?? 0;
  const completed = results.length ? results[results.length - 1].visitors : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        {back}
        <Link
          href={`/${site}/funnels/${funnelId}/edit`}
          className="rounded-md border border-border px-2.5 py-1 text-[12.5px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          Edit
        </Link>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[18px] font-semibold text-foreground">{name}</h2>
          <span className="font-mono text-[12.5px] text-muted-foreground">
            {formatNumber(completed)} / {formatNumber(first)} converted ·{" "}
            <span className="text-foreground">{first > 0 ? ((completed / first) * 100).toFixed(1) : "0"}%</span>
          </span>
        </div>

        {first === 0 ? (
          <p className="mt-6 text-center text-[13px] text-muted-foreground">
            No visitors entered this funnel in the selected range.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            {results.map((r, i) => {
              const pctFirst = first > 0 ? (r.visitors / first) * 100 : 0;
              const prev = i > 0 ? results[i - 1].visitors : r.visitors;
              const pctPrev = prev > 0 ? (r.visitors / prev) * 100 : 100;
              const dropped = i > 0 ? prev - r.visitors : 0;
              return (
                <div key={i}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-[12.5px]">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/15 font-mono text-[10px] font-semibold text-brand">
                        {i + 1}
                      </span>
                      <span className="truncate text-foreground">{stepLabel(steps[i])}</span>
                    </span>
                    <span className="shrink-0 font-mono text-muted-foreground">
                      <span className="text-foreground">{formatNumber(r.visitors)}</span> · {pctFirst.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-7 w-full overflow-hidden rounded-md bg-secondary">
                    <div className="h-full rounded-md bg-brand/70" style={{ width: `${Math.max(pctFirst, 1)}%` }} />
                  </div>
                  {i > 0 && dropped > 0 && (
                    <div className="mt-1 font-mono text-[11px] text-danger">
                      -{formatNumber(dropped)} dropped ({(100 - pctPrev).toFixed(1)}%)
                      {r.medianFromPrevS != null ? ` · median ${formatDuration(r.medianFromPrevS)} to convert` : ""}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
