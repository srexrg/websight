"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import {
  useDashboardParams,
  useEventNames,
  useEventOccurrences,
  useEventTimeseries,
} from "@/lib/dashboard/use-analytics";
import { rangeGranularity } from "@/lib/dashboard/range";
import { PropExplorer } from "@/components/dashboard/events/prop-explorer";
import { RowsSkeleton, Sk } from "@/components/dashboard/states";
import { formatNumber, formatRelativeTime } from "@/lib/dashboard/format";

/** Compact count-over-time bars. */
function CountBars({ data }: { data: { bucket: string; count: number }[] | undefined }) {
  if (!data) return <Sk className="h-24 w-full" />;
  if (data.length === 0) return <div className="flex h-24 items-center text-[12px] text-muted-foreground">No occurrences in range.</div>;
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex h-24 items-end gap-0.5">
      {data.map((d) => (
        <div key={d.bucket} className="flex-1 rounded-t bg-brand/70" style={{ height: `${(d.count / max) * 100}%` }} title={`${d.bucket.slice(0, 10)}: ${d.count}`} />
      ))}
    </div>
  );
}

function OccurrenceRow({ site, occ }: { site: string; occ: { createdAt: string; path: string | null; country: string | null; visitorId: string; props: Record<string, unknown> | null } }) {
  const [open, setOpen] = useState(false);
  const propStr = occ.props ? JSON.stringify(occ.props, null, 2) : null;
  return (
    <li className="py-2">
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => setOpen((v) => !v)} className="flex min-w-0 flex-1 flex-col text-left">
          <span className="truncate font-mono text-[12px] text-foreground">{occ.path ?? "-"}</span>
          <span className="text-[11px] text-muted-foreground">
            {[occ.country, formatRelativeTime(occ.createdAt)].filter(Boolean).join(" · ")}
            {propStr && <span className="ml-1 text-brand">· props</span>}
          </span>
        </button>
        <Link href={`/${site}/profiles/${encodeURIComponent(occ.visitorId)}`} className="shrink-0 font-mono text-[11px] text-muted-foreground hover:text-brand">
          visitor &rarr;
        </Link>
      </div>
      {open && propStr && (
        <pre className="mt-1.5 max-h-48 overflow-auto rounded-lg border border-border bg-secondary/40 p-2 text-[11px] text-foreground">{propStr}</pre>
      )}
    </li>
  );
}

export function EventDetailScreen({ site, name }: { site: string; name: string }) {
  const { params, range } = useDashboardParams();
  const namesQ = useEventNames(site, params);
  const g = rangeGranularity(range);
  const tsQ = useEventTimeseries(site, params, name, g === "minute" ? "hour" : g);
  const occQ = useEventOccurrences(site, params, name);

  const meta = useMemo(() => namesQ.data?.find((e) => e.name === name), [namesQ.data, name]);
  const [desc, setDesc] = useState<string | null>(null);
  const description = desc ?? meta?.description ?? "";

  const saveDesc = useMutation({
    mutationFn: async (value: string) => {
      const res = await fetch(`/api/sites/${site}/event-dictionary`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, description: value }),
      });
      if (!res.ok) throw new Error("save failed");
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href={`/${site}/events`} className="text-[12px] text-muted-foreground hover:text-foreground">&larr; All events</Link>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-mono text-[16px] font-semibold text-foreground">{name}</h3>
          {meta && (
            <span className="font-mono text-[12px] text-muted-foreground">
              {formatNumber(meta.count)} events · {formatNumber(meta.visitors)} visitors
            </span>
          )}
        </div>
        <input
          value={description}
          onChange={(e) => setDesc(e.target.value)}
          onBlur={(e) => e.target.value !== (meta?.description ?? "") && saveDesc.mutate(e.target.value)}
          placeholder="Add a description (what this event means)…"
          className="mt-2 w-full max-w-xl rounded-md border border-input bg-transparent px-2 py-1 text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-ring"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h4 className="mb-2 text-[13px] font-semibold text-foreground">Occurrences over time</h4>
        <CountBars data={tsQ.data} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h4 className="mb-2 text-[13px] font-semibold text-foreground">Properties</h4>
        <PropExplorer site={site} params={params} name={name} expectedProps={meta?.expectedProps ?? []} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h4 className="mb-1 text-[13px] font-semibold text-foreground">Recent occurrences</h4>
        {occQ.isPending ? (
          <RowsSkeleton rows={5} />
        ) : (occQ.data?.length ?? 0) === 0 ? (
          <p className="text-[12px] text-muted-foreground">No occurrences in range.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {occQ.data!.map((o, i) => <OccurrenceRow key={i} site={site} occ={o} />)}
          </ul>
        )}
      </div>
    </div>
  );
}
