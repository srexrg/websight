"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { SessionRow } from "@/lib/analytics/queries";
import {
  useBreakdown,
  useDashboardParams,
  useGoalsWithStats,
  useSessions,
} from "@/lib/dashboard/use-analytics";
import { decodeFilters, encodeFilters } from "@/lib/analytics/filters";
import { GoalTrend } from "@/components/dashboard/goals/goal-trend";
import { BreakdownCard } from "@/components/dashboard/breakdown-card";
import { countryItems, toItems } from "@/components/dashboard/screens/shared";
import { SessionRowItem } from "@/components/dashboard/sessions/session-row";
import { SessionDrawer } from "@/components/dashboard/sessions/session-drawer";
import { EmptyState, ErrorState, RowsSkeleton, Sk } from "@/components/dashboard/states";
import { formatNumber, formatPercent } from "@/lib/dashboard/format";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-[16px] font-semibold text-foreground">{value}</div>
    </div>
  );
}

export function GoalDetailScreen({ site, goalId }: { site: string; goalId: string }) {
  const { params } = useDashboardParams();
  const list = useGoalsWithStats(site, params);
  const goal = (list.data ?? []).find((g) => g.id === goalId);

  // Goal-scoped params: compose the goal filter with any active dashboard filters.
  const goalParams = useMemo(
    () => ({
      ...params,
      f: encodeFilters([...decodeFilters(params.f), { dim: "goal", op: "is" as const, values: [goalId] }]),
    }),
    [params, goalId],
  );

  const countries = useBreakdown(site, goalParams, "country", 6);
  const referrers = useBreakdown(site, goalParams, "referrer_domain", 6);
  const sessions = useSessions(site, goalParams);
  const [selected, setSelected] = useState<SessionRow | null>(null);

  const back = (
    <Link href={`/${site}/goals`} className="inline-block text-[12.5px] text-muted-foreground hover:text-foreground">
      &larr; All goals
    </Link>
  );

  if (list.isPending) {
    return (
      <div className="space-y-4">
        {back}
        <Sk className="h-44 w-full rounded-2xl" />
        <Sk className="h-64 w-full rounded-2xl" />
      </div>
    );
  }
  if (list.isError) {
    return (
      <div className="space-y-4">
        {back}
        <ErrorState message="Could not load this goal." />
      </div>
    );
  }
  if (!goal) {
    return (
      <div className="space-y-4">
        {back}
        <EmptyState title="Goal not found" hint="It may have been archived." />
      </div>
    );
  }

  const defLabel =
    goal.kind === "page"
      ? `path ${goal.pathOp} ${goal.pathPattern}`
      : `event ${goal.eventName}`;
  const value =
    goal.valueCents != null
      ? `$${((goal.uniques * goal.valueCents) / 100).toLocaleString("en-US")}`
      : "—";
  const sessRows = (sessions.data?.pages.flatMap((p) => p.rows) ?? []).slice(0, 20);

  return (
    <>
      <div className="space-y-4">
        {back}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-[18px] font-semibold text-foreground">{goal.name}</h2>
              <p className="mt-0.5 font-mono text-[12px] text-muted-foreground">{defLabel}</p>
            </div>
            <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold uppercase text-muted-foreground">
              {goal.kind}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Conversions" value={formatNumber(goal.conversions)} />
            <Metric label="Unique converters" value={formatNumber(goal.uniques)} />
            <Metric label="Conversion rate" value={formatPercent(goal.rate)} />
            <Metric label="Value" value={value} />
          </div>
          <div className="mt-4">
            <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              Conversions over time
            </div>
            <GoalTrend site={site} goalId={goalId} />
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <BreakdownCard
            title="Top countries"
            items={countryItems(countries.data)}
            isLoading={countries.isPending}
            isError={countries.isError}
            emptyTitle="No converters yet"
          />
          <BreakdownCard
            title="Top referrers"
            items={toItems(referrers.data)}
            isLoading={referrers.isPending}
            isError={referrers.isError}
            emptyTitle="No converters yet"
          />
        </div>

        <section className="flex flex-col rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]">
          <header className="px-[18px] pb-2 pt-4">
            <h3 className="text-[14.5px] font-semibold text-foreground">Recent converting sessions</h3>
          </header>
          <div className="px-1.5 pb-2">
            {sessions.isPending ? (
              <RowsSkeleton rows={6} />
            ) : sessRows.length === 0 ? (
              <EmptyState title="No sessions" hint="No converting sessions in this range." />
            ) : (
              sessRows.map((s) => <SessionRowItem key={s.id} s={s} onOpen={setSelected} />)
            )}
          </div>
        </section>
      </div>
      <SessionDrawer site={site} session={selected} onClose={() => setSelected(null)} />
    </>
  );
}
