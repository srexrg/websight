"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ErrorGroup, ErrorStatus } from "@/lib/analytics/errors";
import { useDashboardParams, useErrorGroups } from "@/lib/dashboard/use-analytics";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/dashboard/states";
import { ExternalChip, RegressedBadge, StatusDot } from "@/components/dashboard/errors/error-chips";
import { formatNumber, formatRelativeTime } from "@/lib/dashboard/format";

const TABS: { key: ErrorStatus | "all"; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "ignored", label: "Ignored" },
  { key: "resolved", label: "Resolved" },
  { key: "all", label: "All" },
];

function TriageMenu({ site, group }: { site: string; group: ErrorGroup }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const mut = useMutation({
    mutationFn: async (status: ErrorStatus) => {
      const res = await fetch(`/api/sites/${site}/errors/${group.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("triage failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["analytics", site, "errors"] }),
  });

  const actions: { label: string; status: ErrorStatus }[] = [
    ...(group.status !== "resolved" ? [{ label: "Resolve", status: "resolved" as const }] : []),
    ...(group.status !== "ignored" ? [{ label: "Ignore", status: "ignored" as const }] : []),
    ...(group.status !== "open" ? [{ label: "Reopen", status: "open" as const }] : []),
  ];

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        className="rounded px-1.5 py-0.5 text-[16px] leading-none text-muted-foreground hover:bg-secondary hover:text-foreground"
        aria-label="Triage"
      >
        &#8943;
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.preventDefault(); setOpen(false); }} />
          <div className="absolute right-0 z-50 mt-1 w-32 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
            {actions.map((a) => (
              <button
                key={a.status}
                onClick={(e) => { e.preventDefault(); mut.mutate(a.status); setOpen(false); }}
                className="block w-full px-3 py-1.5 text-left text-[12.5px] text-foreground hover:bg-secondary"
              >
                {a.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function GroupRow({ site, group }: { site: string; group: ErrorGroup }) {
  return (
    <Link
      href={`/${site}/errors/${group.id}`}
      className="flex items-center gap-3 border-b border-border/60 px-3 py-2.5 last:border-b-0 hover:bg-secondary/50"
    >
      <StatusDot status={group.status} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-mono text-[12.5px] text-foreground">{group.message || "(no message)"}</span>
          {group.regressed && <RegressedBadge />}
          {group.isExternal && <ExternalChip />}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-medium">{group.type}</span>
          <span>·</span>
          <span>{formatNumber(group.visitors)} visitor{group.visitors === 1 ? "" : "s"}</span>
          {group.topBrowser && <><span>·</span><span>{group.topBrowser}</span></>}
          {group.dropped > 0 && <><span>·</span><span className="text-danger/80">rate-limited</span></>}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="font-mono text-[13px] text-foreground">{formatNumber(group.occurrences)}</span>
        <span className="text-[11px] text-muted-foreground">{formatRelativeTime(group.lastSeen)}</span>
      </div>
      <div onClick={(e) => e.preventDefault()}>
        <TriageMenu site={site} group={group} />
      </div>
    </Link>
  );
}

export function ErrorsScreen({ site }: { site: string }) {
  const { params } = useDashboardParams();
  const [tab, setTab] = useState<ErrorStatus | "all">("open");
  const q = useErrorGroups(site, params, tab === "all" ? null : tab);
  const groups = q.data ?? [];

  return (
    <section className="flex flex-col rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <header className="flex flex-wrap items-center justify-between gap-3 px-[18px] pb-2 pt-4">
        <h3 className="text-[14.5px] font-semibold text-foreground">Errors</h3>
        <div className="flex rounded-md bg-secondary p-0.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded px-2.5 py-0.5 font-mono text-[11px] font-semibold transition-colors ${
                tab === t.key ? "bg-card text-foreground shadow-[0_1px_2px_rgba(16,24,40,.06)]" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="px-1 pb-2">
        {q.isPending ? (
          <div className="px-2"><RowsSkeleton rows={6} /></div>
        ) : q.isError ? (
          <ErrorState message="Could not load errors." />
        ) : groups.length === 0 ? (
          <EmptyState
            title={tab === "open" ? "No errors from real users 🎉" : "Nothing here"}
            hint={tab === "open" ? "No uncaught JavaScript errors were reported in this period." : "No error groups match this filter."}
          />
        ) : (
          <div>{groups.map((g) => <GroupRow key={g.id} site={site} group={g} />)}</div>
        )}
      </div>
    </section>
  );
}
