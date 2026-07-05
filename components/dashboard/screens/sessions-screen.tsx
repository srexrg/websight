"use client";

import { useEffect, useRef, useState } from "react";
import type { SessionRow } from "@/lib/analytics/queries";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/dashboard/states";
import { SessionRowItem, visitorLabel } from "@/components/dashboard/sessions/session-row";
import { SessionDrawer } from "@/components/dashboard/sessions/session-drawer";
import {
  useDashboardParams,
  useFilters,
  usePrefetchSessionEvents,
  useSessions,
} from "@/lib/dashboard/use-analytics";
import { downloadCsv } from "@/lib/dashboard/csv";
import { formatDuration } from "@/lib/dashboard/format";

export function SessionsScreen({ site }: { site: string }) {
  const { params } = useDashboardParams();
  const { filters, clear } = useFilters();
  const q = useSessions(site, params);
  const prefetch = usePrefetchSessionEvents(site);
  const [selected, setSelected] = useState<SessionRow | null>(null);

  const rows = q.data?.pages.flatMap((p) => p.rows) ?? [];

  function exportCsv() {
    downloadCsv(
      `sessions-${site}.csv`,
      ["Started", "Visitor", "Country", "City", "Device", "Browser", "OS", "Channel", "Referrer", "Entry", "Exit", "Pageviews", "Duration", "Bounce"],
      rows.map((s) => [
        s.startedAt,
        visitorLabel(s),
        s.country ?? "",
        s.city ?? "",
        s.deviceType ?? "",
        s.browser ?? "",
        s.os ?? "",
        s.channel ?? "",
        s.referrerDomain ?? "",
        s.entryPath ?? "",
        s.exitPath ?? "",
        s.pageviews,
        formatDuration(s.durationS),
        s.isBounce ? "yes" : "no",
      ]),
    );
  }

  // Infinite scroll: fetch the next page when the sentinel scrolls into view.
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && q.hasNextPage && !q.isFetchingNextPage) {
        q.fetchNextPage();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [q.hasNextPage, q.isFetchingNextPage, q]);

  return (
    <>
    <section className="flex flex-col rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <header className="flex items-center justify-between gap-2 px-[18px] pb-2 pt-4">
        <h3 className="text-[14.5px] font-semibold text-foreground">Sessions</h3>
        {rows.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11.5px] text-muted-foreground">
              {rows.length}
              {q.hasNextPage ? "+" : ""} shown
            </span>
            <button
              type="button"
              onClick={exportCsv}
              className="rounded-md border border-border px-2 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              Export CSV
            </button>
          </div>
        )}
      </header>

      <div className="px-1.5 pb-2">
        {q.isPending ? (
          <RowsSkeleton rows={10} />
        ) : q.isError ? (
          <ErrorState message="Could not load sessions." />
        ) : rows.length === 0 ? (
          <EmptyState
            title={filters.length ? "No sessions match these filters" : "No sessions yet"}
            hint={
              filters.length
                ? "Try clearing the active filters."
                : "Sessions appear here as visitors browse your site."
            }
          />
        ) : (
          <>
            {rows.map((s) => (
              <SessionRowItem
                key={s.id}
                s={s}
                onOpen={setSelected}
                onHover={(x) => prefetch(x.id)}
              />
            ))}
            <div ref={sentinelRef} className="h-8" />
            {q.isFetchingNextPage && <RowsSkeleton rows={3} />}
          </>
        )}
      </div>

      {/* clear-filters affordance in the empty state */}
      {rows.length === 0 && filters.length > 0 && q.isSuccess && (
        <button
          onClick={() => clear()}
          className="mx-auto mb-4 rounded-md bg-secondary px-3 py-1.5 text-[12.5px] font-medium text-foreground hover:bg-secondary/70"
        >
          Clear filters
        </button>
      )}
    </section>
    <SessionDrawer site={site} session={selected} onClose={() => setSelected(null)} />
    </>
  );
}
