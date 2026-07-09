"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { EmptyState, RowsSkeleton, Sk } from "@/components/dashboard/states";
import { encodeFilters } from "@/lib/analytics/filters";
import type { LiveBreakdownRow, TickerEvent } from "@/lib/analytics/queries";
import { formatNumber } from "@/lib/dashboard/format";
import {
  useLiveBreakdown,
  useLiveCount,
  useLiveSeries,
  useLiveTicker,
} from "@/lib/dashboard/use-analytics";
import { countryFlag, countryName } from "./shared";

function relTime(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export function RealtimeScreen({ site }: { site: string }) {
  const router = useRouter();
  const live = useLiveCount(site);
  const series = useLiveSeries(site);
  const pages = useLiveBreakdown(site, "path");
  const referrers = useLiveBreakdown(site, "referrer_domain");
  const countries = useLiveBreakdown(site, "country");
  const ticker = useLiveTicker(site);

  const goFilter = (dim: string, value: string) =>
    router.push(`/${site}/overview?f=${encodeURIComponent(encodeFilters([{ dim, op: "is", values: [value] }]))}`);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Live count */}
        <section className="flex flex-col justify-center gap-1 rounded-2xl border border-border bg-card p-[18px] shadow-[0_1px_2px_rgba(16,24,40,.04)]">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success [animation:wsBlink_1.4s_ease-in-out_infinite]" />
            <span className="text-[12.5px] font-medium text-muted-foreground">
              Visitors online now
            </span>
          </div>
          {live.isPending ? (
            <Sk className="h-14 w-24" />
          ) : (
            <span className="font-mono text-[56px] font-semibold leading-none tracking-[-2px] text-foreground">
              {formatNumber(live.data?.count ?? 0)}
            </span>
          )}
          <span className="text-[11.5px] text-muted-foreground/70">last 5 minutes</span>
        </section>

        {/* Per-minute pageviews, last 30 minutes */}
        <section className="rounded-2xl border border-border bg-card p-[18px] shadow-[0_1px_2px_rgba(16,24,40,.04)]">
          <h3 className="pb-2 text-[12.5px] font-medium text-muted-foreground">
            Pageviews per minute · last 30 minutes
          </h3>
          {series.isPending ? (
            <Sk className="h-[120px] w-full" />
          ) : (
            <div className="h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series.data ?? []} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                  <XAxis
                    dataKey="bucket"
                    tickFormatter={(b: string) => format(parseISO(b), "HH:mm")}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "var(--font-jetbrains)" }}
                    minTickGap={40}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--secondary)" }}
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <div className="rounded-lg border border-border bg-popover px-2.5 py-1.5 shadow-[0_4px_14px_rgba(16,24,40,.08)]">
                          <p className="font-mono text-[12px] font-semibold text-foreground">
                            {payload[0].value as number}{" "}
                            <span className="font-sans text-[11px] font-medium text-muted-foreground">views</span>
                          </p>
                        </div>
                      ) : null
                    }
                  />
                  <Bar dataKey="pageviews" fill="var(--brand)" radius={[2, 2, 0, 0]} minPointSize={1} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <LiveList title="Active pages" q={pages} onClick={(v) => goFilter("path", v)} />
        <LiveList
          title="Referrers"
          q={referrers}
          onClick={(v) => goFilter("referrer_domain", v)}
          emptyHint="Traffic in the last 5 minutes is direct."
        />
        <LiveList
          title="Countries"
          q={countries}
          onClick={(v) => goFilter("country", v)}
          render={(v) => `${countryFlag(v)} ${countryName(v)}`.trim()}
        />
      </div>

      <Ticker events={ticker.data} isLoading={ticker.isPending} />
    </div>
  );
}

function LiveList({
  title,
  q,
  onClick,
  render,
  emptyHint,
}: {
  title: string;
  q: { data?: LiveBreakdownRow[]; isPending: boolean };
  onClick: (value: string) => void;
  render?: (value: string) => string;
  emptyHint?: string;
}) {
  const max = Math.max(...(q.data ?? []).map((r) => r.visitors), 1);
  return (
    <section className="rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <header className="flex items-center justify-between px-[18px] pb-1 pt-4">
        <h3 className="text-[14.5px] font-semibold text-foreground">{title}</h3>
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[.5px] text-muted-foreground/70">
          Now
        </span>
      </header>
      <div className="px-[18px] pb-3">
        {q.isPending ? (
          <RowsSkeleton rows={4} />
        ) : !q.data || q.data.length === 0 ? (
          <EmptyState title="No one right now" hint={emptyHint} />
        ) : (
          <ul>
            {q.data.map((r) => (
              <li key={r.value} className="border-b border-border/60 last:border-b-0">
                <button
                  onClick={() => onClick(r.value)}
                  title="Filter the dashboard"
                  className="relative flex w-full items-center gap-3 py-[7px] text-left"
                >
                  <span className="relative flex min-w-0 flex-1 items-center">
                    <span
                      className="absolute inset-y-0.5 left-0 rounded-[4px] bg-accent"
                      style={{ width: `${Math.max((r.visitors / max) * 100, 2)}%` }}
                      aria-hidden
                    />
                    <span className="relative z-10 truncate px-1.5 text-[13px] text-foreground hover:underline">
                      {render ? render(r.value) : r.value}
                    </span>
                  </span>
                  <span className="w-8 shrink-0 text-right font-mono text-[13px] font-medium text-foreground">
                    {r.visitors}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Ticker({ events, isLoading }: { events?: TickerEvent[]; isLoading: boolean }) {
  // New items must not jump under the cursor: freeze a snapshot while hovered.
  const [frozen, setFrozen] = useState<TickerEvent[] | null>(null);
  const hovered = frozen !== null;
  const rows = frozen ?? events;

  return (
    <section
      className="rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]"
      onMouseEnter={() => setFrozen(events ?? [])}
      onMouseLeave={() => setFrozen(null)}
    >
      <header className="flex items-center justify-between px-[18px] pb-1 pt-4">
        <h3 className="text-[14.5px] font-semibold text-foreground">Activity feed</h3>
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[.5px] text-muted-foreground/70">
          {hovered ? "paused" : "live · 30 min"}
        </span>
      </header>
      <div className="max-h-96 overflow-y-auto px-[18px] pb-3">
        {isLoading ? (
          <RowsSkeleton rows={6} />
        ) : !rows || rows.length === 0 ? (
          <EmptyState
            title="No events in the last 30 minutes"
            hint="Events stream in here the moment visitors arrive."
          />
        ) : (
          <ul>
            {rows.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-2.5 border-b border-border/60 py-[7px] [animation:wsRise_.4s_ease] last:border-b-0"
              >
                <span
                  className={`rounded px-1.5 py-0.5 font-mono text-[10.5px] font-semibold ${
                    e.name === "pageview"
                      ? "bg-secondary text-muted-foreground"
                      : "bg-accent text-accent-foreground"
                  }`}
                >
                  {e.name}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-foreground">
                  {e.path}
                </span>
                {e.country && <span className="text-[13px]">{countryFlag(e.country)}</span>}
                {e.device_type && (
                  <span className="hidden text-[11.5px] text-muted-foreground sm:block">
                    {e.browser ?? e.device_type}
                  </span>
                )}
                <span className="w-16 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
                  {relTime(e.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
