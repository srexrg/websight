"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { GoalWithStats } from "@/lib/analytics/queries";
import { useDashboardParams, useGoalsWithStats } from "@/lib/dashboard/use-analytics";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/dashboard/states";
import { GoalDialog, type GoalDraft } from "@/components/dashboard/goals/goal-dialog";
import { GoalSparkline } from "@/components/dashboard/goals/goal-sparkline";
import { formatNumber, formatPercent } from "@/lib/dashboard/format";

const TEMPLATES: { label: string; hint: string; draft: GoalDraft }[] = [
  { label: "Newsletter signup", hint: "event newsletter_subscribe", draft: { name: "Newsletter signup", kind: "event", eventName: "newsletter_subscribe" } },
  { label: "Purchase", hint: "page /thank-you", draft: { name: "Purchase", kind: "page", pathOp: "exact", pathPattern: "/thank-you" } },
  { label: "Signed up", hint: "event signup_click", draft: { name: "Signed up", kind: "event", eventName: "signup_click" } },
];

function GoalDefLabel({ g }: { g: GoalWithStats }) {
  if (g.kind === "page") {
    const verb = g.pathOp === "exact" ? "is" : g.pathOp === "contains" ? "contains" : "matches";
    return <>path {verb} <span className="text-foreground">{g.pathPattern}</span></>;
  }
  const props = g.propFilters.map((f) => `${f.dim.replace(/^prop:/, "")} ${f.op} ${f.values[0]}`).join(", ");
  return <>event <span className="text-foreground">{g.eventName}</span>{props ? ` · ${props}` : ""}</>;
}

export function GoalsScreen({ site }: { site: string }) {
  const { params } = useDashboardParams();
  const q = useGoalsWithStats(site, params);
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GoalWithStats | null>(null);
  const [draft, setDraft] = useState<GoalDraft | undefined>(undefined);
  const goals = q.data ?? [];

  function openNew(preset?: GoalDraft) {
    setEditing(null);
    setDraft(preset);
    setDialogOpen(true);
  }

  const archive = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sites/${site}/goals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("archive failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["analytics", site, "goals-stats"] }),
  });

  return (
    <>
      <section className="flex flex-col rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]">
        <header className="flex items-center justify-between gap-2 px-[18px] pb-2 pt-4">
          <h3 className="text-[14.5px] font-semibold text-foreground">Goals</h3>
          <button
            onClick={() => openNew()}
            className="rounded-md bg-brand px-2.5 py-1 text-[12.5px] font-medium text-brand-foreground hover:opacity-90"
          >
            + New goal
          </button>
        </header>

        <div className="px-1.5 pb-2">
          {q.isPending ? (
            <RowsSkeleton rows={5} />
          ) : q.isError ? (
            <ErrorState message="Could not load goals." />
          ) : goals.length === 0 ? (
            <div className="px-1.5">
              <EmptyState
                title="No goals yet"
                hint="Track signups, purchases, or any key page or event. Start from a template:"
              />
              <div className="mx-auto mb-4 flex max-w-md flex-wrap justify-center gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.label}
                    onClick={() => openNew(t.draft)}
                    className="rounded-md border border-border px-2.5 py-1.5 text-left hover:bg-secondary/60"
                  >
                    <span className="block text-[12.5px] font-medium text-foreground">{t.label}</span>
                    <span className="block font-mono text-[10.5px] text-muted-foreground">{t.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="hidden items-center gap-2 px-3 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground md:flex">
                <span className="flex-1">Goal</span>
                <span className="w-24">Trend</span>
                <span className="w-16 text-right">Uniques</span>
                <span className="w-16 text-right">Conv.</span>
                <span className="w-16 text-right">Rate</span>
                <span className="w-20" />
              </div>
              {goals.map((g) => (
                <div
                  key={g.id}
                  className="group flex items-center gap-2 border-b border-border/60 px-3 py-2 last:border-0"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-center gap-1.5">
                      <Link
                        href={`/${site}/goals/${g.id}`}
                        className="truncate text-[13px] font-medium text-foreground hover:text-brand"
                      >
                        {g.name}
                      </Link>
                      <span className="shrink-0 rounded-full bg-secondary px-1.5 py-0.5 font-mono text-[9.5px] font-semibold uppercase text-muted-foreground">
                        {g.kind}
                      </span>
                    </span>
                    <span className="truncate font-mono text-[11px] text-muted-foreground">
                      <GoalDefLabel g={g} />
                    </span>
                  </span>
                  <span className="hidden w-24 md:block">
                    <GoalSparkline site={site} goalId={g.id} />
                  </span>
                  <span className="w-16 text-right font-mono text-[12.5px] text-foreground">
                    {formatNumber(g.uniques)}
                  </span>
                  <span className="w-16 text-right font-mono text-[12.5px] text-muted-foreground">
                    {formatNumber(g.conversions)}
                  </span>
                  <span
                    className="w-16 text-right font-mono text-[12.5px] text-foreground"
                    title={`${formatNumber(g.uniques)} of ${formatNumber(g.visitors)} unique visitors in range`}
                  >
                    {formatPercent(g.rate)}
                  </span>
                  <span className="flex w-20 justify-end gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => {
                        setEditing(g);
                        setDraft(undefined);
                        setDialogOpen(true);
                      }}
                      className="text-[11.5px] text-muted-foreground hover:text-foreground"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => archive.mutate(g.id)}
                      className="text-[11.5px] text-muted-foreground hover:text-destructive"
                    >
                      Archive
                    </button>
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </section>
      <GoalDialog site={site} open={dialogOpen} onOpenChange={setDialogOpen} goal={editing} draft={draft} />
    </>
  );
}
