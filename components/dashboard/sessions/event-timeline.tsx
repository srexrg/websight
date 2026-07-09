"use client";

import { useState } from "react";
import type { SessionEvent } from "@/lib/analytics/queries";
import { EmptyState, ErrorState, Sk } from "@/components/dashboard/states";
import { formatDuration } from "@/lib/dashboard/format";

function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function gapSeconds(a: string, b: string): number {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 1000));
}

/** Expandable key/value view for a custom event's props. */
function EventProps({ props }: { props: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const entries = Object.entries(props);
  if (entries.length === 0) return null;
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="font-mono text-[10.5px] text-muted-foreground hover:text-foreground"
      >
        {open ? "▾" : "▸"} {entries.length} propert{entries.length === 1 ? "y" : "ies"}
      </button>
      {open && (
        <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 rounded-md bg-secondary/60 p-2 font-mono text-[11px]">
          {entries.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="truncate text-foreground">
                {typeof v === "object" ? JSON.stringify(v) : String(v)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export function EventTimeline({
  events,
  isPending,
  isError,
}: {
  events?: SessionEvent[];
  isPending: boolean;
  isError: boolean;
}) {
  if (isPending) {
    return (
      <div className="space-y-3 p-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Sk key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }
  if (isError) return <ErrorState message="Could not load this session's events." />;
  if (!events || events.length === 0) {
    return <EmptyState title="No events" hint="This session has no recorded events yet." />;
  }

  return (
    <ol className="px-5 py-3">
      {events.map((e, i) => {
        const prev = events[i - 1];
        const gap = prev ? gapSeconds(prev.createdAt, e.createdAt) : 0;
        const isPv = e.name === "pageview";
        const isLast = i === events.length - 1;
        return (
          <li key={e.id}>
            {gap >= 60 && (
              <div className="flex items-center py-0.5 pl-[3px] text-[10.5px] text-muted-foreground/70">
                <span className="mr-3 h-3 w-px bg-border" />
                <span className="font-mono">{formatDuration(gap)} idle</span>
              </div>
            )}
            <div className="relative flex gap-3 pb-3">
              <div className="relative flex w-3.5 shrink-0 justify-center">
                <span
                  className={`z-10 mt-[3px] h-3.5 w-3.5 rounded-full border-2 ${
                    isPv ? "border-brand bg-card" : "border-[#5FC2A0] bg-[#12291F]"
                  }`}
                />
                {!isLast && <span className="absolute top-[3px] h-full w-px bg-border" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[13px] text-foreground">
                    {isPv ? e.title || e.path || "Pageview" : e.name}
                  </span>
                  <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground">
                    {clock(e.createdAt)}
                  </span>
                </div>
                {isPv ? (
                  <span className="block truncate font-mono text-[11px] text-muted-foreground">
                    {e.path}
                  </span>
                ) : (
                  e.props && <EventProps props={e.props} />
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
