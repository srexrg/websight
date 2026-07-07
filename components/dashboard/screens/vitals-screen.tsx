"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useDashboardParams, useVitalsBreakdown, useVitalsPages, useVitalsSummary, useVitalsTimeseries } from "@/lib/dashboard/use-analytics";
import type { AnalyticsParams } from "@/lib/dashboard/use-analytics";
import { addFilter, decodeFilters, encodeFilters } from "@/lib/analytics/filters";
import type { VitalBreakdownRow, VitalMetric } from "@/lib/analytics/vitals";
import { VITAL_META, formatVital } from "@/lib/analytics/vitals";
import { rangeGranularity } from "@/lib/dashboard/range";
import { MetricCards, RATING_COLOR } from "@/components/dashboard/vitals/metric-cards";
import { VitalsTimeseries } from "@/components/dashboard/vitals/vitals-timeseries";
import { VitalsPagesTable } from "@/components/dashboard/vitals/pages-table";
import { EmptyState, ErrorState, RowsSkeleton, Sk } from "@/components/dashboard/states";
import { CopySnippet } from "@/components/dashboard/copy-snippet";
import { formatNumber } from "@/lib/dashboard/format";

const DEVICES = [
  { key: "all", label: "All" },
  { key: "desktop", label: "Desktop" },
  { key: "mobile", label: "Mobile" },
] as const;
type Device = (typeof DEVICES)[number]["key"];

function BreakdownMini({ title, rows, metric }: { title: string; rows: VitalBreakdownRow[] | undefined; metric: VitalMetric }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <h4 className="mb-1.5 text-[12px] font-semibold text-foreground">{title}</h4>
      {!rows ? (
        <RowsSkeleton rows={4} />
      ) : rows.length === 0 ? (
        <p className="py-2 text-[12px] text-muted-foreground">No data.</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((r) => (
            <li key={r.value} className="flex items-center justify-between gap-2 text-[12px]">
              <span className="min-w-0 flex-1 truncate text-foreground">{r.value}</span>
              <span className="flex shrink-0 items-center gap-1.5 font-mono text-muted-foreground">
                {r.rating && <span className="h-2 w-2 rounded-full" style={{ background: RATING_COLOR[r.rating] }} />}
                {formatVital(metric, r.p75)}
                <span className="text-[10px] text-muted-foreground/60">n={formatNumber(r.sample)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function VitalsScreen({ site, vitalsEnabled, snippet }: { site: string; vitalsEnabled: boolean; snippet: string }) {
  const { params, range } = useDashboardParams();
  const [device, setDevice] = useState<Device>("all");
  const [metric, setMetric] = useState<VitalMetric>("LCP");
  const [enabled, setEnabled] = useState(vitalsEnabled);

  // Effective params = global filters + the dedicated device control.
  const effParams: AnalyticsParams = useMemo(() => {
    if (device === "all") return params;
    const next = addFilter(decodeFilters(params.f), "device_type", device, "is");
    return { ...params, f: encodeFilters(next) };
  }, [params, device]);

  // Minute buckets are too fine for a p75 line; step up to hourly on 24h.
  const g = rangeGranularity(range);
  const summaryQ = useVitalsSummary(site, effParams);
  const tsQ = useVitalsTimeseries(site, effParams, metric, g === "minute" ? "hour" : g);
  const pagesQ = useVitalsPages(site, effParams);
  const byDevice = useVitalsBreakdown(site, effParams, "device_type", metric);
  const byBrowser = useVitalsBreakdown(site, effParams, "browser", metric);
  const byCountry = useVitalsBreakdown(site, effParams, "country", metric);

  const enable = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/sites/${site}/settings`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ vitals_enabled: true }),
      });
      if (!res.ok) throw new Error("enable failed");
    },
    onSuccess: () => setEnabled(true),
  });

  const totalSamples = (summaryQ.data ?? []).reduce((s, r) => s + r.sample, 0);
  const hasData = totalSamples > 0;

  return (
    <section className="relative flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-[14.5px] font-semibold text-foreground">Web Vitals</h3>
          {hasData && (
            <span className="font-mono text-[11.5px] text-muted-foreground">{formatNumber(totalSamples)} samples</span>
          )}
        </div>
        <div className="flex rounded-md bg-secondary p-0.5">
          {DEVICES.map((d) => (
            <button
              key={d.key}
              onClick={() => setDevice(d.key)}
              className={`rounded px-2.5 py-0.5 font-mono text-[11px] font-semibold transition-colors ${
                device === d.key ? "bg-card text-foreground shadow-[0_1px_2px_rgba(16,24,40,.06)]" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {summaryQ.isPending ? (
        <Sk className="h-28 w-full" />
      ) : summaryQ.isError ? (
        <ErrorState message="Could not load web vitals." />
      ) : !hasData ? (
        enabled ? (
          <EmptyState title="Waiting for first samples" hint="Web Vitals capture is on. Real-user measurements appear here as visitors load your pages." />
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6">
            <h4 className="text-[15px] font-semibold text-foreground">Turn on Web Vitals</h4>
            <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
              Add <code className="rounded bg-secondary px-1 font-mono text-[12px] text-foreground">data-vitals</code> to your
              snippet to capture real-user LCP, INP, CLS, FCP and TTFB. It loads a small extra chunk only on pages that opt in.
            </p>
            <div className="mt-3 max-w-2xl">
              <CopySnippet code={snippet} />
            </div>
            <button
              onClick={() => enable.mutate()}
              disabled={enable.isPending}
              className="mt-3 rounded-md bg-brand px-3 py-1.5 text-[13px] font-medium text-brand-foreground hover:opacity-90 disabled:opacity-60"
            >
              {enable.isPending ? "Saving…" : "I've added it"}
            </button>
          </div>
        )
      ) : (
        <>
          <MetricCards summary={summaryQ.data} selected={metric} onSelect={setMetric} />

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-1 flex items-center gap-2">
              <h4 className="text-[13px] font-semibold text-foreground">{VITAL_META[metric].label} p75 over time</h4>
              <span className="text-[11px] text-muted-foreground">{VITAL_META[metric].hint}</span>
            </div>
            {tsQ.isPending ? <Sk className="h-44 w-full" /> : <VitalsTimeseries data={tsQ.data} metric={metric} />}
          </div>

          <div className="grid gap-2.5 md:grid-cols-3">
            <BreakdownMini title="By device" rows={byDevice.data} metric={metric} />
            <BreakdownMini title="By browser" rows={byBrowser.data} metric={metric} />
            <BreakdownMini title="By country" rows={byCountry.data} metric={metric} />
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <h4 className="mb-2 text-[13px] font-semibold text-foreground">Pages</h4>
            {pagesQ.isPending ? (
              <RowsSkeleton rows={6} />
            ) : (
              <VitalsPagesTable site={site} params={effParams} rows={pagesQ.data ?? []} />
            )}
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground/70">
            p75 hidden under {30} samples. Safari doesn&apos;t report INP or LCP, so those reflect Chromium/Firefox visitors.
            The web-vitals library measures hard page loads; in-app (soft) SPA navigations are excluded.
          </p>
        </>
      )}
    </section>
  );
}
