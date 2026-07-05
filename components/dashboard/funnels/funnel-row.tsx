"use client";

import Link from "next/link";
import type { Funnel } from "@/lib/analytics/funnels";
import { windowLabel } from "@/lib/analytics/funnels";
import { useDashboardParams, useFunnelResults } from "@/lib/dashboard/use-analytics";
import { formatNumber } from "@/lib/dashboard/format";

export function FunnelRow({
  site,
  funnel,
  onArchive,
}: {
  site: string;
  funnel: Funnel;
  onArchive: (id: string) => void;
}) {
  const { params } = useDashboardParams();
  const q = useFunnelResults(site, params, funnel.id);
  const r = q.data?.results ?? [];
  const entrants = r[0]?.visitors ?? 0;
  const completed = r.length ? r[r.length - 1].visitors : 0;
  const rate = entrants > 0 ? (completed / entrants) * 100 : 0;

  return (
    <div className="group flex items-center gap-3 border-b border-border/60 px-3 py-2.5 last:border-0">
      <span className="flex min-w-0 flex-1 flex-col">
        <Link href={`/${site}/funnels/${funnel.id}`} className="truncate text-[13px] font-medium text-foreground hover:text-brand">
          {funnel.name}
        </Link>
        <span className="font-mono text-[11px] text-muted-foreground">
          {funnel.steps.length} steps · {windowLabel(funnel.windowMinutes)}
        </span>
      </span>

      {q.isPending ? (
        <span className="font-mono text-[12px] text-muted-foreground">…</span>
      ) : (
        <span className="flex items-center gap-4 font-mono text-[12.5px]">
          <span className="w-16 text-right text-foreground">
            {formatNumber(entrants)} <span className="text-[10px] text-muted-foreground">in</span>
          </span>
          <span className="hidden w-16 text-right text-foreground sm:inline">
            {formatNumber(completed)} <span className="text-[10px] text-muted-foreground">done</span>
          </span>
          <span className="w-14 text-right text-foreground">{rate.toFixed(1)}%</span>
        </span>
      )}

      <button
        onClick={() => onArchive(funnel.id)}
        className="text-[11.5px] text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
      >
        Archive
      </button>
    </div>
  );
}
