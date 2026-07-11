"use client";

import { useState } from "react";
import type { RetentionBasis, RetentionCell, RetentionInterval, RetentionParams } from "@/lib/analytics/retention";
import { useDashboardParams, useGoalsWithStats, useRetention } from "@/lib/dashboard/use-analytics";
import { RetentionGrid, type CellCoord } from "@/components/dashboard/retention/grid";
import { CohortTrend } from "@/components/dashboard/retention/cohort-trend";
import { CellDrilldown } from "@/components/dashboard/retention/cell-drilldown";
import { EmptyState, ErrorState, Sk } from "@/components/dashboard/states";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumber } from "@/lib/dashboard/format";

const SELECT = "h-auto w-auto rounded-md px-2 py-1 text-[12.5px] shadow-none";

const INTERVALS: RetentionInterval[] = ["day", "week", "month"];
const INTERVAL_LABEL: Record<RetentionInterval, string> = { day: "Daily", week: "Weekly", month: "Monthly" };

type Selected = { cohort: string; active: string; period: number } | null;

export function RetentionScreen({ site }: { site: string }) {
  const { params } = useDashboardParams();
  const [interval, setInterval] = useState<RetentionInterval>("week");
  const [periods, setPeriods] = useState(12);
  const [basis, setBasis] = useState<RetentionBasis>("cohort");
  const [entryGoal, setEntryGoal] = useState<string | null>(null);
  const [returnGoal, setReturnGoal] = useState<string | null>(null);
  const [selected, setSelected] = useState<Selected>(null);
  const [trend, setTrend] = useState<Set<string>>(new Set());

  const rp: RetentionParams = { interval, periods, basis, entryGoal, returnGoal };
  const q = useRetention(site, params, rp);
  const goalsQ = useGoalsWithStats(site, params);
  const goals = goalsQ.data ?? [];

  const selectedCoord: CellCoord | null = selected
    ? { cohort: selected.cohort, period: selected.period }
    : null;

  function onCellClick(cohort: string, cell: RetentionCell) {
    if (selected?.cohort === cohort && selected?.period === cell.period) {
      setSelected(null);
    } else {
      setSelected({ cohort, active: cell.bucket, period: cell.period });
    }
  }

  function toggleTrend(cohort: string) {
    setTrend((prev) => {
      const next = new Set(prev);
      if (next.has(cohort)) next.delete(cohort);
      else if (next.size < 6) next.add(cohort);
      return next;
    });
  }

  return (
    <section className="relative flex flex-col rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <header className="flex flex-wrap items-center justify-between gap-3 px-[18px] pb-2 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[14.5px] font-semibold text-foreground">Retention</h3>
          {q.data && q.data.totalVisitors > 0 && (
            <span className="font-mono text-[11.5px] text-muted-foreground">
              {formatNumber(q.data.totalVisitors)} in cohorts
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md bg-secondary p-0.5">
            {INTERVALS.map((iv) => (
              <button
                key={iv}
                onClick={() => {
                  setInterval(iv);
                  setSelected(null);
                  setTrend(new Set());
                }}
                className={`rounded px-2 py-0.5 font-mono text-[11px] font-semibold transition-colors ${
                  interval === iv
                    ? "bg-card text-foreground shadow-[0_1px_2px_rgba(16,24,40,.06)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {INTERVAL_LABEL[iv]}
              </button>
            ))}
          </div>
          <Select value={String(periods)} onValueChange={(v) => setPeriods(Number(v))}>
            <SelectTrigger className={SELECT}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[8, 12, 26].map((n) => (
                <SelectItem key={n} value={String(n)} className="text-[12.5px]">
                  {n} periods
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={entryGoal ?? "first-seen"}
            onValueChange={(v) => { setEntryGoal(v === "first-seen" ? null : v); setSelected(null); }}
          >
            <SelectTrigger className={SELECT} aria-label="Cohort entry">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="first-seen" className="text-[12.5px]">Entry: first seen</SelectItem>
              {goals.map((g) => (
                <SelectItem key={g.id} value={g.id} className="text-[12.5px]">
                  Entry: {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={returnGoal ?? "any-visit"}
            onValueChange={(v) => { setReturnGoal(v === "any-visit" ? null : v); setSelected(null); }}
          >
            <SelectTrigger className={SELECT} aria-label="Return criterion">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any-visit" className="text-[12.5px]">Return: any visit</SelectItem>
              {goals.map((g) => (
                <SelectItem key={g.id} value={g.id} className="text-[12.5px]">
                  Return: {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex rounded-md bg-secondary p-0.5">
            {(["cohort", "previous"] as RetentionBasis[]).map((b) => (
              <button
                key={b}
                onClick={() => setBasis(b)}
                className={`rounded px-2 py-0.5 font-mono text-[11px] font-semibold transition-colors ${
                  basis === b
                    ? "bg-card text-foreground shadow-[0_1px_2px_rgba(16,24,40,.06)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title={b === "cohort" ? "Percent of the cohort" : "Percent of the previous period"}
              >
                {b === "cohort" ? "% cohort" : "% prev"}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="px-[18px] pb-4">
        {q.isPending ? (
          <Sk className="h-[420px] w-full" />
        ) : q.isError ? (
          <ErrorState message="Could not load retention." />
        ) : !q.data || q.data.cohorts.length === 0 ? (
          <EmptyState
            title="No cohorts yet"
            hint="Retention appears once returning visitors accumulate across periods. Identified or persistent-mode visitors are tracked across days."
          />
        ) : (
          <>
            <RetentionGrid
              result={q.data}
              selected={selectedCoord}
              onCellClick={onCellClick}
              trendSelected={trend}
              onCohortToggle={toggleTrend}
            />

            {selected && (
              <CellDrilldown
                site={site}
                params={params}
                rp={rp}
                cohort={selected.cohort}
                active={selected.active}
                period={selected.period}
                onClose={() => setSelected(null)}
              />
            )}

            {trend.size > 0 && (
              <div className="mt-4 border-t border-border/60 pt-3">
                <div className="mb-1 flex items-center justify-between">
                  <h4 className="text-[12.5px] font-semibold text-foreground">Cohort decay</h4>
                  <button
                    onClick={() => setTrend(new Set())}
                    className="text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                </div>
                <CohortTrend result={q.data} selected={[...trend]} />
              </div>
            )}

            <p className="mt-3 text-[11px] text-muted-foreground/70">
              Cells show the percentage that returned; hover for counts. Dashed = in-progress period,
              hatched = low sample (&lt;10). Click a cell to list visitors, a cohort label to chart its
              decay.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
