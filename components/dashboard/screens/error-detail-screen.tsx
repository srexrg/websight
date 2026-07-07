"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ErrorBreakdownRow, ErrorStatus } from "@/lib/analytics/errors";
import {
  useDashboardParams,
  useErrorBreakdown,
  useErrorGroup,
  useErrorGroupStats,
  useErrorOccurrences,
  useErrorTimeseries,
} from "@/lib/dashboard/use-analytics";
import { rangeGranularity } from "@/lib/dashboard/range";
import { ErrorState, RowsSkeleton, Sk } from "@/components/dashboard/states";
import { ExternalChip, RegressedBadge } from "@/components/dashboard/errors/error-chips";
import { StackView } from "@/components/dashboard/errors/stack-view";
import { formatNumber, formatRelativeTime } from "@/lib/dashboard/format";

const STATUS_LABEL: Record<ErrorStatus, string> = { open: "Open", resolved: "Resolved", ignored: "Ignored" };

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-[17px] font-semibold text-foreground">{value}</div>
    </div>
  );
}

function MiniBreakdown({ title, rows }: { title: string; rows: ErrorBreakdownRow[] | undefined }) {
  const total = (rows ?? []).reduce((s, r) => s + r.count, 0) || 1;
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <h4 className="mb-1.5 text-[12px] font-semibold text-foreground">{title}</h4>
      {!rows ? <RowsSkeleton rows={3} /> : rows.length === 0 ? (
        <p className="py-1 text-[12px] text-muted-foreground">No data.</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((r) => (
            <li key={r.value} className="relative flex items-center justify-between gap-2 text-[12px]">
              <span className="relative z-10 min-w-0 flex-1 truncate text-foreground">{r.value}</span>
              <span className="relative z-10 shrink-0 font-mono text-muted-foreground">{formatNumber(r.count)}</span>
              <span className="absolute inset-y-0 left-0 rounded bg-secondary" style={{ width: `${(r.count / total) * 100}%` }} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Compact occurrence-over-time bars. */
function OccBars({ data }: { data: { bucket: string; count: number }[] | undefined }) {
  if (!data) return <Sk className="h-20 w-full" />;
  if (data.length === 0) return <div className="flex h-20 items-center text-[12px] text-muted-foreground">No occurrences in range.</div>;
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex h-20 items-end gap-0.5">
      {data.map((d) => (
        <div key={d.bucket} className="flex-1 rounded-t bg-danger/70" style={{ height: `${(d.count / max) * 100}%` }} title={`${d.bucket.slice(0, 10)}: ${d.count}`} />
      ))}
    </div>
  );
}

export function ErrorDetailScreen({ site, groupId }: { site: string; groupId: string }) {
  const { params, range } = useDashboardParams();
  const qc = useQueryClient();
  const groupQ = useErrorGroup(site, groupId);
  const statsQ = useErrorGroupStats(site, params, groupId);
  const tsQ = useErrorTimeseries(site, params, groupId, rangeGranularity(range) === "minute" ? "hour" : rangeGranularity(range));
  const byPath = useErrorBreakdown(site, params, groupId, "path");
  const byBrowser = useErrorBreakdown(site, params, groupId, "browser");
  const byOs = useErrorBreakdown(site, params, groupId, "os");
  const byCountry = useErrorBreakdown(site, params, groupId, "country");
  const occQ = useErrorOccurrences(site, params, groupId);

  const triage = useMutation({
    mutationFn: async (status: ErrorStatus) => {
      const res = await fetch(`/api/sites/${site}/errors/${groupId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("triage failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["analytics", site, "error-group", groupId] });
      qc.invalidateQueries({ queryKey: ["analytics", site, "errors"] });
    },
  });

  if (groupQ.isError) return <ErrorState message="Could not load this error." />;
  const g = groupQ.data;
  const sampleStack = occQ.data?.[0]?.stack ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href={`/${site}/errors`} className="text-[12px] text-muted-foreground hover:text-foreground">&larr; All errors</Link>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        {!g ? (
          <Sk className="h-12 w-2/3" />
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-danger">{g.type}</span>
                  {g.regressed && <RegressedBadge />}
                  {g.isExternal && <ExternalChip />}
                  <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{STATUS_LABEL[g.status]}</span>
                </div>
                <p className="mt-1 break-words font-mono text-[13.5px] text-foreground">{g.message || "(no message)"}</p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                {g.status !== "resolved" && <button onClick={() => triage.mutate("resolved")} className="rounded-md border border-border px-2.5 py-1 text-[12px] text-foreground hover:bg-secondary">Resolve</button>}
                {g.status !== "ignored" && <button onClick={() => triage.mutate("ignored")} className="rounded-md border border-border px-2.5 py-1 text-[12px] text-muted-foreground hover:bg-secondary">Ignore</button>}
                {g.status !== "open" && <button onClick={() => triage.mutate("open")} className="rounded-md border border-border px-2.5 py-1 text-[12px] text-foreground hover:bg-secondary">Reopen</button>}
              </div>
            </div>
            {g.dropped > 0 && (
              <p className="mt-2 text-[11.5px] text-danger/80">{formatNumber(g.dropped)} occurrences were rate-limited at ingest during storms.</p>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <Tile label="Occurrences (range)" value={statsQ.data ? formatNumber(statsQ.data.occurrences) : "…"} />
        <Tile label="Affected visitors" value={statsQ.data ? formatNumber(statsQ.data.visitors) : "…"} />
        <Tile label="First seen" value={g ? formatRelativeTime(g.firstSeen) : "…"} />
        <Tile label="Last seen" value={g ? formatRelativeTime(g.lastSeen) : "…"} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h4 className="mb-2 text-[13px] font-semibold text-foreground">Occurrences over time</h4>
        <OccBars data={tsQ.data} />
      </div>

      <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-4">
        <MiniBreakdown title="Pages" rows={byPath.data} />
        <MiniBreakdown title="Browsers" rows={byBrowser.data} />
        <MiniBreakdown title="OS" rows={byOs.data} />
        <MiniBreakdown title="Countries" rows={byCountry.data} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h4 className="mb-2 text-[13px] font-semibold text-foreground">Stack trace</h4>
        {occQ.isPending ? <Sk className="h-32 w-full" /> : <StackView stack={sampleStack} message={g?.message} />}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h4 className="mb-2 text-[13px] font-semibold text-foreground">Recent occurrences</h4>
        {occQ.isPending ? (
          <RowsSkeleton rows={5} />
        ) : (occQ.data?.length ?? 0) === 0 ? (
          <p className="text-[12px] text-muted-foreground">No occurrences in range.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {occQ.data!.map((o, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2 text-[12px]">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-mono text-foreground">{o.path ?? "-"}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {[o.browser, o.os, o.country].filter(Boolean).join(" · ") || "unknown"} · {formatRelativeTime(o.createdAt)}
                  </span>
                </div>
                <Link href={`/${site}/profiles/${encodeURIComponent(o.visitorId)}`} className="shrink-0 font-mono text-[11px] text-muted-foreground hover:text-brand">
                  visitor &rarr;
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
