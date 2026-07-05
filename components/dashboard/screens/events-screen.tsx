"use client";

import { EmptyState, ErrorState, RowsSkeleton } from "@/components/dashboard/states";
import { formatNumber } from "@/lib/dashboard/format";
import { useDashboardParams, useEventBreakdown } from "@/lib/dashboard/use-analytics";

export function EventsScreen({ site }: { site: string }) {
  const { params } = useDashboardParams();
  const events = useEventBreakdown(site, params);

  return (
    <section className="rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <header className="flex items-center justify-between px-[18px] pb-2 pt-4">
        <h3 className="text-[14.5px] font-semibold text-foreground">Custom Events</h3>
      </header>
      <div className="px-[18px] pb-4">
        {events.isPending ? (
          <RowsSkeleton rows={8} />
        ) : events.isError ? (
          <ErrorState />
        ) : !events.data || events.data.length === 0 ? (
          <EmptyState
            title="No custom events in this range"
            hint={`Track them with websight.track("signup", { plan: "pro" }) or add data-ws-event="signup" to any element - no code changes beyond the snippet.`}
            docHref="/docs/custom-events"
            docLabel="Custom events docs"
          />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-2 text-[11px] font-bold uppercase tracking-[.8px] text-muted-foreground/70">
                  Event
                </th>
                <th className="pb-2 text-right font-mono text-[11px] font-semibold uppercase tracking-[.5px] text-muted-foreground/70">
                  Count
                </th>
                <th className="pb-2 text-right font-mono text-[11px] font-semibold uppercase tracking-[.5px] text-muted-foreground/70">
                  Unique
                </th>
              </tr>
            </thead>
            <tbody>
              {events.data.map((e) => (
                <tr key={e.name} className="border-b border-border/60 last:border-b-0">
                  <td className="py-[9px] text-[13px] font-medium text-foreground">{e.name}</td>
                  <td className="py-[9px] text-right font-mono text-[13px] text-foreground">
                    {formatNumber(e.count)}
                  </td>
                  <td className="py-[9px] text-right font-mono text-[13px] text-muted-foreground">
                    {formatNumber(e.visitors)}
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
