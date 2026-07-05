"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format, parseISO } from "date-fns";
import type { Granularity, TimeseriesPoint } from "@/lib/analytics/queries";
import { formatNumber } from "@/lib/dashboard/format";
import { EmptyState, ErrorState, Sk } from "./states";

export type TimeseriesMetric = "visitors" | "pageviews" | "sessions";

const METRIC_LABELS: Record<TimeseriesMetric, string> = {
  visitors: "Visitors",
  pageviews: "Page views",
  sessions: "Sessions",
};

function bucketLabel(bucket: string, granularity: Granularity): string {
  const d = parseISO(bucket);
  if (granularity === "hour") return format(d, "HH:mm");
  if (granularity === "month") return format(d, "MMM yyyy");
  return format(d, "MMM d");
}

/** Themed Recharts v3 area chart; colors come from CSS variables so dark
 *  mode re-themes without a remount. Comparison series lands with plan 05. */
export function TimeseriesChart({
  data,
  comparison,
  granularity,
  metric = "visitors",
  isLoading = false,
  isError = false,
  height = 280,
}: {
  data: TimeseriesPoint[] | undefined;
  /** Comparison period series, aligned by bucket index (dashed line). */
  comparison?: TimeseriesPoint[];
  granularity: Granularity;
  metric?: TimeseriesMetric;
  isLoading?: boolean;
  isError?: boolean;
  height?: number;
}) {
  if (isLoading) {
    return (
      <div style={{ height }} className="w-full p-2">
        <Sk className="h-full w-full" />
      </div>
    );
  }
  if (isError) return <ErrorState />;
  if (!data || data.length === 0 || data.every((p) => p[metric] === 0)) {
    return (
      <EmptyState
        title="No traffic in this range"
        hint="Data appears within seconds of your first pageview."
      />
    );
  }

  const points = data.map((p, i) => ({
    ...p,
    label: bucketLabel(p.bucket, granularity),
    prev: comparison?.[i]?.[metric] ?? null,
  }));
  const hasComparison = Boolean(comparison && comparison.length > 0);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="ws-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-jetbrains)" }}
            minTickGap={28}
            dy={6}
          />
          <YAxis
            width={44}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-jetbrains)" }}
            tickFormatter={(v: number) => formatNumber(v)}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ stroke: "var(--brand)", strokeOpacity: 0.35 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const current = payload.find((p) => p.dataKey === metric)?.value as number;
              const prev = payload.find((p) => p.dataKey === "prev")?.value as number | null;
              return (
                <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-[0_4px_14px_rgba(16,24,40,.08)]">
                  <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
                  <p className="font-mono text-[13px] font-semibold text-foreground">
                    {formatNumber(current ?? 0)}{" "}
                    <span className="font-sans text-[11px] font-medium text-muted-foreground">
                      {METRIC_LABELS[metric].toLowerCase()}
                    </span>
                  </p>
                  {prev != null && (
                    <p className="font-mono text-[12px] text-muted-foreground">
                      {formatNumber(prev)}{" "}
                      <span className="font-sans text-[11px]">previous</span>
                      {prev > 0 && (
                        <span className="ml-1 font-sans text-[11px]">
                          ({current >= prev ? "+" : ""}
                          {(((current - prev) / prev) * 100).toFixed(0)}%)
                        </span>
                      )}
                    </p>
                  )}
                </div>
              );
            }}
          />
          {hasComparison && (
            <Area
              type="monotone"
              dataKey="prev"
              stroke="var(--muted-foreground)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              fill="none"
              dot={false}
              activeDot={false}
            />
          )}
          <Area
            type="monotone"
            dataKey={metric}
            stroke="var(--brand)"
            strokeWidth={2}
            fill="url(#ws-area)"
            dot={false}
            activeDot={{ r: 3.5, fill: "var(--brand)", strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
