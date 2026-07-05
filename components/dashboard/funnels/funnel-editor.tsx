"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Funnel, FunnelStep } from "@/lib/analytics/funnels";
import { FUNNEL_WINDOWS } from "@/lib/analytics/funnels";
import type { FunnelStepResult } from "@/lib/analytics/queries";
import type { PathOp } from "@/lib/analytics/goals";
import { formatNumber } from "@/lib/dashboard/format";

const INPUT =
  "rounded-md border border-input bg-transparent px-2.5 py-1.5 text-[13px] text-foreground outline-none focus:border-ring";
const WINDOW_LABELS: Record<number, string> = { 30: "30 minutes", 1440: "1 day", 10080: "7 days", 43200: "30 days" };

type GoalLite = { id: string; name: string };

function stepValid(s: FunnelStep): boolean {
  if (s.kind === "page") return s.pathPattern.trim() !== "";
  if (s.kind === "event") return s.eventName.trim() !== "";
  return s.goalId !== "";
}

export function FunnelEditor({ site, funnel }: { site: string; funnel: Funnel | null }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = useState(funnel?.name ?? "");
  const [windowMinutes, setWindowMinutes] = useState(funnel?.windowMinutes ?? 1440);
  const [steps, setSteps] = useState<FunnelStep[]>(
    funnel?.steps ?? [
      { kind: "page", pathOp: "exact", pathPattern: "" },
      { kind: "page", pathOp: "exact", pathPattern: "" },
    ],
  );
  const [preview, setPreview] = useState<FunnelStepResult[] | null>(null);

  const goalsQ = useQuery<GoalLite[]>({
    queryKey: ["goals-def", site],
    queryFn: async () => {
      const r = await fetch(`/api/sites/${site}/goals`);
      return r.ok ? r.json() : [];
    },
    staleTime: 60_000,
  });

  const setStep = (i: number, s: FunnelStep) => setSteps((r) => r.map((x, j) => (j === i ? s : x)));
  const move = (i: number, dir: -1 | 1) =>
    setSteps((r) => {
      const j = i + dir;
      if (j < 0 || j >= r.length) return r;
      const next = [...r];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const ready = name.trim() !== "" && steps.length >= 2 && steps.length <= 8 && steps.every(stepValid);

  // Live preview over the last 7 days (debounced).
  useEffect(() => {
    if (!ready) return; // stale preview hidden at render via `ready`
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/sites/${site}/funnels/preview`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ steps, windowMinutes }),
        signal: ctrl.signal,
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setPreview(d))
        .catch(() => {});
    }, 500);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [ready, steps, windowMinutes, site]);

  const save = useMutation({
    mutationFn: async () => {
      const body = { name: name.trim(), steps, windowMinutes };
      const url = funnel ? `/api/sites/${site}/funnels/${funnel.id}` : `/api/sites/${site}/funnels`;
      const res = await fetch(url, {
        method: funnel ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Save failed");
      return res.json() as Promise<Funnel>;
    },
    onSuccess: (f) => {
      qc.invalidateQueries({ queryKey: ["funnels", site] });
      router.push(`/${site}/funnels/${f.id}`);
    },
  });

  const entrants = preview?.[0]?.visitors ?? 0;
  const completed = preview?.[preview.length - 1]?.visitors ?? 0;

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.push(`/${site}/funnels`)}
        className="text-[12.5px] text-muted-foreground hover:text-foreground"
      >
        &larr; All funnels
      </button>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Funnel name</span>
            <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} placeholder="Signup funnel" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Conversion window</span>
            <select className={INPUT} value={windowMinutes} onChange={(e) => setWindowMinutes(Number(e.target.value))}>
              {FUNNEL_WINDOWS.map((w) => (
                <option key={w} value={w}>{WINDOW_LABELS[w]}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 space-y-2">
          {steps.map((s, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-secondary/30 p-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/15 font-mono text-[11px] font-semibold text-brand">
                {i + 1}
              </span>
              <select
                className={`${INPUT} w-28`}
                value={s.kind}
                onChange={(e) => {
                  const k = e.target.value as FunnelStep["kind"];
                  setStep(i, k === "page" ? { kind: "page", pathOp: "exact", pathPattern: "" } : k === "event" ? { kind: "event", eventName: "" } : { kind: "goal", goalId: "" });
                }}
              >
                <option value="page">Page</option>
                <option value="event">Event</option>
                <option value="goal">Goal</option>
              </select>

              {s.kind === "page" && (
                <>
                  <select className={`${INPUT} w-28`} value={s.pathOp} onChange={(e) => setStep(i, { ...s, pathOp: e.target.value as PathOp })}>
                    <option value="exact">is exactly</option>
                    <option value="contains">contains</option>
                    <option value="wildcard">matches</option>
                  </select>
                  <input className={`${INPUT} min-w-0 flex-1`} value={s.pathPattern} onChange={(e) => setStep(i, { ...s, pathPattern: e.target.value })} placeholder="/pricing" />
                </>
              )}
              {s.kind === "event" && (
                <input className={`${INPUT} min-w-0 flex-1`} value={s.eventName} onChange={(e) => setStep(i, { ...s, eventName: e.target.value })} placeholder="signup_click" />
              )}
              {s.kind === "goal" && (
                <select className={`${INPUT} min-w-0 flex-1`} value={s.goalId} onChange={(e) => setStep(i, { ...s, goalId: e.target.value })}>
                  <option value="">Select a goal…</option>
                  {(goalsQ.data ?? []).map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              )}

              <div className="flex shrink-0 items-center gap-0.5">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="px-1 text-muted-foreground hover:text-foreground disabled:opacity-30">↑</button>
                <button onClick={() => move(i, 1)} disabled={i === steps.length - 1} className="px-1 text-muted-foreground hover:text-foreground disabled:opacity-30">↓</button>
                <button onClick={() => setSteps((r) => r.filter((_, j) => j !== i))} disabled={steps.length <= 2} className="px-1 text-muted-foreground hover:text-destructive disabled:opacity-30">×</button>
              </div>
            </div>
          ))}
          {steps.length < 8 && (
            <button
              onClick={() => setSteps((r) => [...r, { kind: "page", pathOp: "exact", pathPattern: "" }])}
              className="text-[12.5px] font-medium text-brand hover:underline"
            >
              + Add step
            </button>
          )}
        </div>

        {ready && preview && (
          <div className="mt-4 rounded-lg bg-secondary/50 px-3 py-2 text-[12.5px] text-muted-foreground">
            Last 7 days:{" "}
            <span className="font-mono font-semibold text-foreground">{formatNumber(entrants)}</span> entered ·{" "}
            <span className="font-mono font-semibold text-foreground">{formatNumber(completed)}</span> completed ·{" "}
            <span className="font-mono font-semibold text-foreground">
              {entrants > 0 ? `${((completed / entrants) * 100).toFixed(1)}%` : "0%"}
            </span>{" "}
            overall
          </div>
        )}

        {save.isError && <p className="mt-3 text-[12.5px] text-destructive">{(save.error as Error).message}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => router.push(`/${site}/funnels`)} disabled={save.isPending} className="rounded-md bg-secondary px-3 py-1.5 text-[13px] font-medium text-foreground hover:bg-secondary/70 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={() => save.mutate()} disabled={!ready || save.isPending} className="rounded-md bg-brand px-3 py-1.5 text-[13px] font-medium text-brand-foreground hover:opacity-90 disabled:opacity-50">
            {save.isPending ? "Saving…" : funnel ? "Save funnel" : "Create funnel"}
          </button>
        </div>
      </section>
    </div>
  );
}
