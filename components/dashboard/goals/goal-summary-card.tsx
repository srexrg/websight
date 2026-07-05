"use client";

import Link from "next/link";
import { useDashboardParams, useGoalsWithStats } from "@/lib/dashboard/use-analytics";
import { formatNumber, formatPercent } from "@/lib/dashboard/format";
import { Sk } from "@/components/dashboard/states";

/** Top goals by conversions (Overview summary card, docs/redesign/08 M3). */
export function GoalSummaryCard({ site }: { site: string }) {
  const { params } = useDashboardParams();
  const q = useGoalsWithStats(site, params);
  const goals = (q.data ?? []).slice().sort((a, b) => b.conversions - a.conversions).slice(0, 5);

  if (!q.isPending && goals.length === 0) return null; // no goals -> don't clutter overview

  return (
    <section className="flex flex-col rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <header className="flex items-center justify-between px-[18px] pb-2 pt-4">
        <h3 className="text-[14.5px] font-semibold text-foreground">Goals</h3>
        <Link href={`/${site}/goals`} className="text-[12px] text-muted-foreground hover:text-foreground">
          All goals &rarr;
        </Link>
      </header>
      <div className="px-[18px] pb-3">
        {q.isPending ? (
          <div className="space-y-2 pt-1">
            {[0, 1, 2].map((i) => (
              <Sk key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : (
          <ul>
            {goals.map((g) => (
              <li key={g.id} className="border-b border-border/60 last:border-0">
                <Link
                  href={`/${site}/goals/${g.id}`}
                  className="flex items-center justify-between gap-2 py-1.5 hover:opacity-80"
                >
                  <span className="truncate text-[13px] text-foreground">{g.name}</span>
                  <span className="flex shrink-0 items-center gap-3 font-mono text-[12.5px]">
                    <span className="text-foreground">{formatNumber(g.conversions)}</span>
                    <span className="w-12 text-right text-muted-foreground">{formatPercent(g.rate)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
