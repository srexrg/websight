"use client";

import { useEffect, useRef } from "react";
import { WarningCircle } from "@phosphor-icons/react";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/dashboard/states";
import { useDashboardParams, useFilters, useReplays } from "@/lib/dashboard/use-analytics";
import { ReplayRowItem } from "./replay-row";
import { ReplaysLocked } from "./replays-locked";

export function ReplaysScreen({
  site,
  replayEnabled,
  storageConfigured,
}: {
  site: string;
  replayEnabled: boolean;
  storageConfigured: boolean;
}) {
  const { params } = useDashboardParams();
  const { filters, clear } = useFilters();
  const q = useReplays(site, params);

  const rows = q.data?.pages.flatMap((p) => p.rows) ?? [];

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

  // Not usable and nothing recorded yet -> teach how to turn it on.
  const off = !storageConfigured || !replayEnabled;
  if (off && q.isSuccess && rows.length === 0 && filters.length === 0) {
    return <ReplaysLocked site={site} storageConfigured={storageConfigured} />;
  }

  return (
    <section className="flex flex-col rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <header className="flex items-center justify-between gap-2 px-[18px] pb-2 pt-4">
        <h3 className="text-[14.5px] font-semibold text-foreground">Replays</h3>
        {rows.length > 0 && (
          <span className="font-mono text-[11.5px] text-muted-foreground">
            {rows.length}
            {q.hasNextPage ? "+" : ""} shown
          </span>
        )}
      </header>

      {/* Recordings exist but recording is currently paused. */}
      {rows.length > 0 && off && (
        <div className="mx-[18px] mb-2 flex items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-2.5 py-1.5 text-[12px] text-muted-foreground">
          <WarningCircle size={14} weight="fill" className="shrink-0 text-muted-foreground" />
          {storageConfigured
            ? "Recording is currently off, so no new sessions are being captured. Existing recordings are still watchable until they expire."
            : "Replay storage is not configured, so new sessions cannot be recorded and existing recordings cannot be played."}
        </div>
      )}

      <div className="px-1.5 pb-2">
        {q.isPending ? (
          <RowsSkeleton rows={10} />
        ) : q.isError ? (
          <ErrorState message="Could not load replays." />
        ) : rows.length === 0 ? (
          <EmptyState
            title={filters.length ? "No replays match these filters" : "Waiting for sampled visits"}
            hint={
              filters.length
                ? "Try clearing the active filters."
                : "Recordings land here as sampled visits come in. Raise the sample rate in Settings to capture more."
            }
          />
        ) : (
          <>
            {rows.map((r) => (
              <ReplayRowItem key={r.id} site={site} r={r} />
            ))}
            <div ref={sentinelRef} className="h-8" />
            {q.isFetchingNextPage && <RowsSkeleton rows={3} />}
          </>
        )}
      </div>

      {rows.length === 0 && filters.length > 0 && q.isSuccess && (
        <button
          onClick={() => clear()}
          className="mx-auto mb-4 rounded-md bg-secondary px-3 py-1.5 text-[12.5px] font-medium text-foreground hover:bg-secondary/70"
        >
          Clear filters
        </button>
      )}
    </section>
  );
}
