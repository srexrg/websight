"use client";

import Link from "next/link";
import type { EventName } from "@/lib/analytics/events-custom";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/dashboard/states";
import { useDashboardParams, useEventNames } from "@/lib/dashboard/use-analytics";
import { formatNumber, formatRelativeTime } from "@/lib/dashboard/format";

/** A dictionary row whose event hasn't arrived in 30d is "stale". */
function isStale(e: EventName): boolean {
  if (!e.dictLastSeen) return false;
  return Date.now() - Date.parse(e.dictLastSeen) > 30 * 86_400_000;
}

export function EventsScreen({ site }: { site: string }) {
  const { params } = useDashboardParams();
  const q = useEventNames(site, params);
  const events = q.data ?? [];

  return (
    <section className="rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <header className="flex items-center justify-between px-[18px] pb-2 pt-4">
        <h3 className="text-[14.5px] font-semibold text-foreground">Custom Events</h3>
        {events.length > 0 && (
          <span className="font-mono text-[11.5px] text-muted-foreground">{events.length} event types</span>
        )}
      </header>
      <div className="px-[18px] pb-4">
        {q.isPending ? (
          <RowsSkeleton rows={8} />
        ) : q.isError ? (
          <ErrorState />
        ) : events.length === 0 ? (
          <EmptyState
            title="No custom events in this range"
            hint={`Track them with websight.track("signup", { plan: "pro" }) or add data-ws-event="signup" to any element - no code changes beyond the snippet.`}
            docHref="/docs/custom-events"
            docLabel="Custom events docs"
          />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-[11px] font-medium text-muted-foreground">
                <th className="pb-2">Event</th>
                <th className="pb-2 text-right font-mono">Count</th>
                <th className="pb-2 text-right font-mono">Visitors</th>
                <th className="hidden pb-2 text-right font-mono sm:table-cell">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.name} className="group border-b border-border/50 last:border-0 hover:bg-secondary/40">
                  <td className="py-2">
                    <Link href={`/${site}/events/${encodeURIComponent(e.name)}`} className="flex flex-col">
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-[12.5px] text-foreground group-hover:text-brand">{e.name}</span>
                        {isStale(e) && (
                          <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">stale</span>
                        )}
                      </span>
                      {e.description && <span className="truncate text-[11px] text-muted-foreground">{e.description}</span>}
                    </Link>
                  </td>
                  <td className="py-2 text-right font-mono text-[12.5px] text-foreground">{formatNumber(e.count)}</td>
                  <td className="py-2 text-right font-mono text-[12.5px] text-muted-foreground">{formatNumber(e.visitors)}</td>
                  <td className="hidden py-2 text-right font-mono text-[12px] text-muted-foreground sm:table-cell">
                    {formatRelativeTime(e.lastSeen)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
