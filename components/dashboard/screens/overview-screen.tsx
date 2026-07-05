"use client";

import { useState } from "react";
import Link from "next/link";
import { BreakdownCard } from "@/components/dashboard/breakdown-card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { TimeseriesChart, type TimeseriesMetric } from "@/components/dashboard/timeseries-chart";
import type { BreakdownDimension } from "@/lib/analytics/queries";
import { formatDuration, formatNumber, formatPercent } from "@/lib/dashboard/format";
import { rangeGranularity } from "@/lib/dashboard/range";
import {
  useBreakdown,
  useDashboardParams,
  useEventBreakdown,
  useFilters,
  useOverview,
  useTimeseries,
} from "@/lib/dashboard/use-analytics";
import { countryItems, toItems } from "./shared";

const PAGE_TABS = [
  { key: "path", label: "Top" },
  { key: "entry_path", label: "Entry" },
  { key: "exit_path", label: "Exit" },
] as const;

const SOURCE_TABS = [
  { key: "channel", label: "Channels" },
  { key: "referrer_domain", label: "Referrers" },
  { key: "utm_campaign", label: "Campaigns" },
] as const;

const LOCATION_TABS = [
  { key: "country", label: "Countries" },
  { key: "region", label: "Regions" },
  { key: "city", label: "Cities" },
] as const;

const DEVICE_TABS = [
  { key: "browser", label: "Browser" },
  { key: "os", label: "OS" },
  { key: "device_type", label: "Device" },
] as const;

function useTab<T extends readonly { key: string }[]>(tabs: T) {
  const [tab, setTab] = useState<T[number]["key"]>(tabs[0].key);
  return { tab, setTab, dim: tab as BreakdownDimension };
}

export function OverviewScreen({ site }: { site: string }) {
  const { range, params, compareParams } = useDashboardParams();
  const { filters, add } = useFilters();
  const granularity = rangeGranularity(range);
  const [metric, setMetric] = useState<TimeseriesMetric>("visitors");

  const overview = useOverview(site, params);
  const prevOverview = useOverview(site, compareParams ?? params, compareParams != null);
  const series = useTimeseries(site, params, granularity);
  const prevSeries = useTimeseries(site, compareParams ?? params, granularity, compareParams != null);

  const pages = useTab(PAGE_TABS);
  const sources = useTab(SOURCE_TABS);
  const locations = useTab(LOCATION_TABS);
  const devices = useTab(DEVICE_TABS);

  const pagesQ = useBreakdown(site, params, pages.dim, 8);
  const sourcesQ = useBreakdown(site, params, sources.dim, 8);
  const locationsQ = useBreakdown(site, params, locations.dim, 8);
  const devicesQ = useBreakdown(site, params, devices.dim, 8);
  const eventsQ = useEventBreakdown(site, params, 8);

  const o = overview.data;
  const p = compareParams ? prevOverview.data : undefined;
  const comparing = compareParams != null && p != null;

  const viewsPerSession = (x?: { pageviews: number; sessions: number }) =>
    x && x.sessions > 0 ? x.pageviews / x.sessions : 0;
  const delta = (cur?: number, prev?: number) =>
    comparing && prev != null && prev !== 0 && cur != null ? (cur - prev) / prev : null;

  const activeFor = (dim: string) =>
    filters.filter((f) => f.dim === dim && f.op === "is").flatMap((f) => f.values);

  const card = (
    q: ReturnType<typeof useBreakdown>,
    dim: BreakdownDimension,
    items: ReturnType<typeof toItems>,
  ) => ({
    items,
    isLoading: q.isPending,
    isError: q.isError,
    onRowClick: (v: string) => add(dim, v),
    activeValues: activeFor(dim),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label="Unique Visitors"
          value={formatNumber(o?.visitors ?? 0)}
          delta={delta(o?.visitors, p?.visitors)}
          isLoading={overview.isPending}
          active={metric === "visitors"}
          onClick={() => setMetric("visitors")}
        />
        <MetricCard
          label="Sessions"
          value={formatNumber(o?.sessions ?? 0)}
          delta={delta(o?.sessions, p?.sessions)}
          isLoading={overview.isPending}
          active={metric === "sessions"}
          onClick={() => setMetric("sessions")}
        />
        <MetricCard
          label="Page Views"
          value={formatNumber(o?.pageviews ?? 0)}
          delta={delta(o?.pageviews, p?.pageviews)}
          isLoading={overview.isPending}
          active={metric === "pageviews"}
          onClick={() => setMetric("pageviews")}
        />
        <MetricCard
          label="Views / Session"
          value={viewsPerSession(o).toFixed(2)}
          delta={delta(viewsPerSession(o), viewsPerSession(p))}
          isLoading={overview.isPending}
        />
        <MetricCard
          label="Bounce Rate"
          value={formatPercent(o?.bounceRate ?? 0)}
          delta={delta(o?.bounceRate, p?.bounceRate)}
          invertDelta
          isLoading={overview.isPending}
        />
        <MetricCard
          label="Avg. Duration"
          value={formatDuration(o?.avgDurationS ?? 0)}
          delta={delta(o?.avgDurationS, p?.avgDurationS)}
          isLoading={overview.isPending}
        />
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
        <TimeseriesChart
          data={series.data}
          comparison={compareParams ? prevSeries.data : undefined}
          granularity={granularity}
          metric={metric}
          isLoading={series.isPending}
          isError={series.isError}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownCard
          title="Pages"
          tabs={[...PAGE_TABS]}
          activeTab={pages.tab}
          onTabChange={(k) => pages.setTab(k as typeof pages.tab)}
          {...card(pagesQ, pages.dim, toItems(pagesQ.data, pages.dim === "path"))}
          emptyHint="Pageviews appear here as soon as the tracker sends data."
        />
        <BreakdownCard
          title="Sources"
          tabs={[...SOURCE_TABS]}
          activeTab={sources.tab}
          onTabChange={(k) => sources.setTab(k as typeof sources.tab)}
          {...card(sourcesQ, sources.dim, toItems(sourcesQ.data))}
          emptyHint="Channels are classified from referrers and UTM tags."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownCard
          title="Locations"
          tabs={[...LOCATION_TABS]}
          activeTab={locations.tab}
          onTabChange={(k) => locations.setTab(k as typeof locations.tab)}
          {...card(
            locationsQ,
            locations.dim,
            locations.dim === "country" ? countryItems(locationsQ.data) : toItems(locationsQ.data),
          )}
        />
        <BreakdownCard
          title="Devices"
          tabs={[...DEVICE_TABS]}
          activeTab={devices.tab}
          onTabChange={(k) => devices.setTab(k as typeof devices.tab)}
          {...card(devicesQ, devices.dim, toItems(devicesQ.data))}
        />
      </div>

      <BreakdownCard
        title="Custom Events"
        valueLabel="Count"
        items={eventsQ.data?.map((e) => ({ label: e.name, value: e.count, secondary: `${formatNumber(e.visitors)} unique` }))}
        isLoading={eventsQ.isPending}
        isError={eventsQ.isError}
        emptyTitle="No custom events in this range"
        emptyHint={`Track them with websight.track("signup") or data-ws-event attributes.`}
        onRowClick={(v) => add("name", v)}
        activeValues={activeFor("name")}
        action={
          <Link href={`/${site}/events`} className="text-[12px] font-semibold text-accent-foreground hover:underline">
            Details →
          </Link>
        }
      />
    </div>
  );
}
