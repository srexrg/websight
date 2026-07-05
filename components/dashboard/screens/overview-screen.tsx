"use client";

import { useState } from "react";
import { useQueryState } from "nuqs";
import { BreakdownCard } from "@/components/dashboard/breakdown-card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { TimeseriesChart, type TimeseriesMetric } from "@/components/dashboard/timeseries-chart";
import { formatDuration, formatNumber, formatPercent } from "@/lib/dashboard/format";
import { rangeGranularity, rangeParser } from "@/lib/dashboard/range";
import { useBreakdown, useOverview, useTimeseries } from "@/lib/dashboard/use-analytics";
import { countryItems } from "./shared";

export function OverviewScreen({ site }: { site: string }) {
  const [range] = useQueryState("range", rangeParser);
  const granularity = rangeGranularity(range);
  const [metric, setMetric] = useState<TimeseriesMetric>("visitors");

  const overview = useOverview(site, range);
  const series = useTimeseries(site, range, granularity);
  const pages = useBreakdown(site, range, "path", 8);
  const channels = useBreakdown(site, range, "channel", 8);
  const countries = useBreakdown(site, range, "country", 8);
  const devices = useBreakdown(site, range, "device_type", 8);
  const browsers = useBreakdown(site, range, "browser", 8);

  const spark = (key: TimeseriesMetric) => series.data?.map((p) => p[key]);
  const o = overview.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <MetricCard
          label="Unique Visitors"
          value={formatNumber(o?.visitors ?? 0)}
          sparkline={spark("visitors")}
          isLoading={overview.isPending}
          active={metric === "visitors"}
          onClick={() => setMetric("visitors")}
        />
        <MetricCard
          label="Page Views"
          value={formatNumber(o?.pageviews ?? 0)}
          sparkline={spark("pageviews")}
          isLoading={overview.isPending}
          active={metric === "pageviews"}
          onClick={() => setMetric("pageviews")}
        />
        <MetricCard
          label="Bounce Rate"
          value={formatPercent(o?.bounceRate ?? 0)}
          isLoading={overview.isPending}
        />
        <MetricCard
          label="Avg. Duration"
          value={formatDuration(o?.avgDurationS ?? 0)}
          isLoading={overview.isPending}
        />
      </div>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
        <TimeseriesChart
          data={series.data}
          granularity={granularity}
          metric={metric}
          isLoading={series.isPending}
          isError={series.isError}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownCard
          title="Top Pages"
          items={pages.data?.map((r) => ({ label: r.value, value: r.visitors, secondary: `${formatNumber(r.pageviews)} views` }))}
          isLoading={pages.isPending}
          isError={pages.isError}
          emptyHint="Pageviews appear here as soon as the tracker sends data."
        />
        <BreakdownCard
          title="Top Sources"
          items={channels.data?.map((r) => ({ label: r.value, value: r.visitors }))}
          isLoading={channels.isPending}
          isError={channels.isError}
          emptyHint="Channels are classified from referrers and UTM tags."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <BreakdownCard
          title="Countries"
          items={countryItems(countries.data)}
          isLoading={countries.isPending}
          isError={countries.isError}
        />
        <BreakdownCard
          title="Devices"
          items={devices.data?.map((r) => ({ label: r.value, value: r.visitors }))}
          isLoading={devices.isPending}
          isError={devices.isError}
        />
        <BreakdownCard
          title="Browsers"
          items={browsers.data?.map((r) => ({ label: r.value, value: r.visitors }))}
          isLoading={browsers.isPending}
          isError={browsers.isError}
        />
      </div>
    </div>
  );
}
