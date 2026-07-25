"use client";

import { ArrowRight, Flag, Lightning } from "@phosphor-icons/react";
import type { SessionEvent } from "@/lib/analytics/queries";
import { EmptyState, ErrorState, Sk } from "@/components/dashboard/states";

function offsetLabel(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/** Index of the event at/just-before the playhead, for highlight. */
function activeIndex(events: SessionEvent[], playheadAbsMs: number): number {
  let idx = -1;
  for (let i = 0; i < events.length; i++) {
    if (new Date(events[i].createdAt).getTime() <= playheadAbsMs) idx = i;
    else break;
  }
  return idx;
}

type Kind = "start" | "navigation" | "custom";

/** Same colour language as the scrubber marker rail, so the two read as one. */
const KIND_STYLE: Record<Kind, { color: string; icon: typeof Flag }> = {
  start: { color: "text-brand", icon: Flag },
  navigation: { color: "text-[#3B82F6]", icon: ArrowRight },
  custom: { color: "text-[#F59E0B]", icon: Lightning },
};

/**
 * The session's event list beside the player (docs/redesign/24 M5), mirroring
 * the scrubber's marker language: the first pageview is the session start, later
 * pageviews are navigations, everything else is a custom event. Every row is
 * seekable; the one at/just-before the playhead is highlighted as playback
 * advances. Offsets are shown mono, relative to the recording start.
 */
export function PlayerTimeline({
  events,
  isPending,
  isError,
  startMs,
  currentMs,
  onSeek,
  emptyHint = "This session has no recorded events.",
}: {
  events?: SessionEvent[];
  isPending: boolean;
  isError: boolean;
  startMs: number;
  currentMs: number;
  onSeek: (offsetMs: number) => void;
  emptyHint?: string;
}) {
  if (isPending) {
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Sk key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }
  if (isError) return <ErrorState message="Could not load this session's events." />;
  if (!events || events.length === 0) {
    return <EmptyState title="No events" hint={emptyHint} />;
  }

  const active = activeIndex(events, startMs + currentMs);
  const firstPageviewIdx = events.findIndex((e) => e.name === "pageview");

  return (
    <ol className="p-2">
      {events.map((e, i) => {
        const isPv = e.name === "pageview";
        const kind: Kind = isPv ? (i === firstPageviewIdx ? "start" : "navigation") : "custom";
        const { color, icon: Icon } = KIND_STYLE[kind];
        const offset = Math.max(0, new Date(e.createdAt).getTime() - startMs);
        const isActive = i === active;
        const primary = isPv ? e.title || e.path || "Pageview" : e.name;

        return (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => onSeek(offset)}
              title={`Seek to ${primary}`}
              className={`flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors ${
                isActive ? "bg-brand/10" : "hover:bg-secondary/60"
              }`}
            >
              <Icon size={13} weight={kind === "custom" ? "fill" : "bold"} className={`mt-[3px] shrink-0 ${color}`} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span
                    className={`truncate text-[12.5px] ${isActive ? "font-medium text-foreground" : "text-foreground"}`}
                  >
                    {primary}
                  </span>
                  <span className="shrink-0 font-mono text-[10.5px] tabular-nums text-muted-foreground">
                    {offsetLabel(offset)}
                  </span>
                </span>
                {isPv && e.path && (
                  <span className="block truncate font-mono text-[11px] text-muted-foreground">
                    {e.path}
                  </span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
