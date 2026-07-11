"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GoalWithStats } from "@/lib/analytics/queries";
import type { GoalInput, GoalKind, PathOp } from "@/lib/analytics/goals";
import type { FilterOp } from "@/lib/analytics/filters";
import { formatNumber } from "@/lib/dashboard/format";

type PropRow = { key: string; op: FilterOp; value: string };

/** Prefilled create draft, e.g. from an empty-state template. */
export type GoalDraft = {
  name?: string;
  kind?: GoalKind;
  pathOp?: PathOp;
  pathPattern?: string;
  eventName?: string;
};

const INPUT =
  "w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 text-[13px] text-foreground outline-none focus:border-ring";

function goalToRows(g: GoalWithStats): PropRow[] {
  return g.propFilters.map((f) => ({
    key: f.dim.startsWith("prop:") ? f.dim.slice(5) : f.dim,
    op: f.op,
    value: f.values[0] ?? "",
  }));
}

/** Form body; mounted fresh each time the dialog opens, so state seeds from props. */
function GoalForm({
  site,
  goal,
  draft,
  onDone,
}: {
  site: string;
  goal: GoalWithStats | null;
  draft?: GoalDraft;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(goal?.name ?? draft?.name ?? "");
  const [kind, setKind] = useState<GoalKind>(goal?.kind ?? draft?.kind ?? "page");
  const [pathOp, setPathOp] = useState<PathOp>(goal?.pathOp ?? draft?.pathOp ?? "exact");
  const [pathPattern, setPathPattern] = useState(goal?.pathPattern ?? draft?.pathPattern ?? "");
  const [eventName, setEventName] = useState(goal?.eventName ?? draft?.eventName ?? "");
  const [props, setProps] = useState<PropRow[]>(goal ? goalToRows(goal) : []);
  const [value, setValue] = useState(goal?.valueCents != null ? String(goal.valueCents / 100) : "");
  const [preview, setPreview] = useState<{ conversions: number; uniques: number } | null>(null);

  // Live "would have matched" count over the last 7 days (debounced).
  const defReady = name.trim() !== "" && (kind === "page" ? pathPattern.trim() !== "" : eventName.trim() !== "");
  useEffect(() => {
    if (!defReady) return; // stale preview is hidden at render via defReady
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/sites/${site}/goals/preview`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          kind,
          pathPattern: kind === "page" ? pathPattern.trim() : null,
          pathOp: kind === "page" ? pathOp : null,
          eventName: kind === "event" ? eventName.trim() : null,
          propFilters:
            kind === "event"
              ? props
                  .filter((p) => p.key.trim() && p.value.trim())
                  .map((p) => ({ dim: `prop:${p.key.trim()}`, op: p.op, values: [p.value.trim()] }))
              : [],
        }),
        signal: ctrl.signal,
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setPreview(d))
        .catch(() => {});
    }, 400);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [defReady, name, kind, pathOp, pathPattern, eventName, props, site]);

  const save = useMutation({
    mutationFn: async () => {
      const body: GoalInput = {
        name: name.trim(),
        kind,
        pathPattern: kind === "page" ? pathPattern.trim() : null,
        pathOp: kind === "page" ? pathOp : null,
        eventName: kind === "event" ? eventName.trim() : null,
        propFilters:
          kind === "event"
            ? props
                .filter((p) => p.key.trim() && p.value.trim())
                .map((p) => ({ dim: `prop:${p.key.trim()}`, op: p.op, values: [p.value.trim()] }))
            : [],
        valueCents: value.trim() ? Math.round(Number(value) * 100) : null,
      };
      const url = goal ? `/api/sites/${site}/goals/${goal.id}` : `/api/sites/${site}/goals`;
      const res = await fetch(url, {
        method: goal ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Save failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["analytics", site, "goals-stats"] });
      onDone();
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{goal ? "Edit goal" : "New goal"}</DialogTitle>
        <DialogDescription>
          Match a page path or a custom event. Reported over all history.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Name
          </label>
          <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} placeholder="Signed up" />
        </div>

        <div className="flex gap-2">
          {(["page", "event"] as GoalKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`flex-1 rounded-md border px-2.5 py-1.5 text-[12.5px] font-medium ${
                kind === k
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {k === "page" ? "Page view" : "Custom event"}
            </button>
          ))}
        </div>

        {kind === "page" ? (
          <div className="flex gap-2">
            <Select value={pathOp} onValueChange={(v) => setPathOp(v as PathOp)}>
              <SelectTrigger className="h-auto w-32 shrink-0 py-1.5 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exact">is exactly</SelectItem>
                <SelectItem value="contains">contains</SelectItem>
                <SelectItem value="wildcard">matches</SelectItem>
              </SelectContent>
            </Select>
            <input
              className={INPUT}
              value={pathPattern}
              onChange={(e) => setPathPattern(e.target.value)}
              placeholder={pathOp === "wildcard" ? "/thanks/*" : "/signup"}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <input
              className={INPUT}
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="signup_click"
            />
            {props.map((p, i) => (
              <div key={i} className="flex gap-1.5">
                <input
                  className={`${INPUT} flex-1`}
                  value={p.key}
                  onChange={(e) => setProps((r) => r.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))}
                  placeholder="prop key (plan)"
                />
                <Select
                  value={p.op}
                  onValueChange={(v) =>
                    setProps((r) => r.map((x, j) => (j === i ? { ...x, op: v as FilterOp } : x)))
                  }
                >
                  <SelectTrigger className="h-auto w-28 shrink-0 py-1.5 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="is">is</SelectItem>
                    <SelectItem value="is_not">is not</SelectItem>
                    <SelectItem value="contains">contains</SelectItem>
                  </SelectContent>
                </Select>
                <input
                  className={`${INPUT} flex-1`}
                  value={p.value}
                  onChange={(e) => setProps((r) => r.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                  placeholder="pro"
                />
                <button
                  type="button"
                  onClick={() => setProps((r) => r.filter((_, j) => j !== i))}
                  className="px-1.5 text-muted-foreground hover:text-destructive"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setProps((r) => [...r, { key: "", op: "is", value: "" }])}
              className="text-[12px] text-brand hover:underline"
            >
              + prop condition
            </button>
          </div>
        )}

        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Value per conversion (optional)
          </label>
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] text-muted-foreground">$</span>
            <input
              className={`${INPUT} w-28`}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="5"
              inputMode="decimal"
            />
          </div>
        </div>

        {defReady && preview && (
          <p className="rounded-md bg-secondary/60 px-2.5 py-1.5 text-[12px] text-muted-foreground">
            Would have matched{" "}
            <span className="font-mono font-semibold text-foreground">{formatNumber(preview.conversions)}</span>{" "}
            event{preview.conversions === 1 ? "" : "s"} from{" "}
            <span className="font-mono font-semibold text-foreground">{formatNumber(preview.uniques)}</span>{" "}
            visitor{preview.uniques === 1 ? "" : "s"} in the last 7 days.
          </p>
        )}

        {save.isError && <p className="text-[12.5px] text-destructive">{(save.error as Error).message}</p>}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          disabled={save.isPending}
          className="rounded-md bg-secondary px-3 py-1.5 text-[13px] font-medium text-foreground hover:bg-secondary/70 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending || !name.trim()}
          className="rounded-md bg-brand px-3 py-1.5 text-[13px] font-medium text-brand-foreground hover:opacity-90 disabled:opacity-50"
        >
          {save.isPending ? "Saving…" : goal ? "Save" : "Create goal"}
        </button>
      </div>
    </>
  );
}

export function GoalDialog({
  site,
  open,
  onOpenChange,
  goal,
  draft,
}: {
  site: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  goal: GoalWithStats | null;
  draft?: GoalDraft;
}) {
  const key = goal?.id ?? (draft ? `draft:${draft.kind}:${draft.eventName ?? draft.pathPattern ?? ""}` : "new");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <GoalForm key={key} site={site} goal={goal} draft={draft} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
