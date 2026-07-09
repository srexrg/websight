/**
 * Web Vitals read layer (docs/redesign/12). p75 percentiles over `web_vital`
 * events, rated against Google's Core Web Vitals thresholds. The rating is
 * always derived from the raw value (never the stored props.rating), so history
 * re-rates if thresholds move. Thresholds live here for display + client-side
 * cell rating and in `_vital_rating` (SQL) for aggregation - keep them in sync.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import type { Filter } from "./filters";
import type { Granularity } from "./queries";

export type QueryRange = { from: Date; to: Date };
export type VitalMetric = "LCP" | "CLS" | "INP" | "FCP" | "TTFB";
export type VitalRating = "good" | "ni" | "poor";

export const VITAL_METRICS: VitalMetric[] = ["LCP", "INP", "CLS", "FCP", "TTFB"];

/** p75 under this many samples is statistically noisy - hide it. */
export const VITAL_MIN_SAMPLE = 30;

export const VITAL_META: Record<
  VitalMetric,
  { label: string; good: number; poor: number; unit: "ms" | "score"; hint: string }
> = {
  LCP: { label: "LCP", good: 2500, poor: 4000, unit: "ms", hint: "Largest Contentful Paint: when the main content finishes rendering." },
  INP: { label: "INP", good: 200, poor: 500, unit: "ms", hint: "Interaction to Next Paint: delay after a tap/click/keypress." },
  CLS: { label: "CLS", good: 0.1, poor: 0.25, unit: "score", hint: "Cumulative Layout Shift: how much the page unexpectedly moves." },
  FCP: { label: "FCP", good: 1800, poor: 3000, unit: "ms", hint: "First Contentful Paint: when the first content appears." },
  TTFB: { label: "TTFB", good: 800, poor: 1800, unit: "ms", hint: "Time to First Byte: server + network response time." },
};

/** Rating of a raw value for a metric (mirrors _vital_rating in SQL). */
export function ratingOf(metric: VitalMetric, value: number | null): VitalRating | null {
  if (value == null) return null;
  const m = VITAL_META[metric];
  return value <= m.good ? "good" : value <= m.poor ? "ni" : "poor";
}

/** Human value: seconds for large ms, ms for small, 3-dp score for CLS. */
export function formatVital(metric: VitalMetric, value: number | null): string {
  if (value == null) return "-";
  if (VITAL_META[metric].unit === "score") return value.toFixed(3);
  return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`;
}

/** Human threshold annotation, e.g. "≤2.5s · >4s". */
export function thresholdLabel(metric: VitalMetric): string {
  const m = VITAL_META[metric];
  return `≤${formatVital(metric, m.good)} · >${formatVital(metric, m.poor)}`;
}

function client(override?: SupabaseClient): SupabaseClient {
  return override ?? createAdminClient();
}

export type VitalSummaryRow = {
  metric: VitalMetric;
  sample: number;
  p75: number | null;
  good: number;
  ni: number;
  poor: number;
  rating: VitalRating | null;
};

export async function getVitalsSummary(
  siteId: string,
  range: QueryRange,
  supabase?: SupabaseClient,
  filters: Filter[] = [],
): Promise<VitalSummaryRow[]> {
  const { data, error } = await client(supabase).rpc("analytics_vitals_summary", {
    p_site: siteId,
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
    p_filters: filters,
  });
  if (error) throw new Error(`analytics_vitals_summary failed: ${error.message}`);
  return (data as Record<string, unknown>[]).map((r) => ({
    metric: r.metric as VitalMetric,
    sample: Number(r.sample),
    p75: r.p75 == null ? null : Number(r.p75),
    good: Number(r.good),
    ni: Number(r.ni),
    poor: Number(r.poor),
    rating: (r.rating as VitalRating) ?? null,
  }));
}

export type VitalTimeseriesPoint = { bucket: string; p75: number | null; sample: number };

export async function getVitalsTimeseries(
  siteId: string,
  range: QueryRange,
  metric: VitalMetric,
  granularity: Granularity = "day",
  supabase?: SupabaseClient,
  filters: Filter[] = [],
): Promise<VitalTimeseriesPoint[]> {
  const { data, error } = await client(supabase).rpc("analytics_vitals_timeseries", {
    p_site: siteId,
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
    p_metric: metric,
    p_granularity: granularity,
    p_filters: filters,
  });
  if (error) throw new Error(`analytics_vitals_timeseries failed: ${error.message}`);
  return (data as Record<string, unknown>[]).map((r) => ({
    bucket: r.bucket as string,
    p75: r.p75 == null ? null : Number(r.p75),
    sample: Number(r.sample),
  }));
}

export type VitalPageRow = {
  path: string;
  samples: number;
  lcp: number | null;
  cls: number | null;
  inp: number | null;
  fcp: number | null;
  ttfb: number | null;
};

export async function getVitalsPages(
  siteId: string,
  range: QueryRange,
  supabase?: SupabaseClient,
  filters: Filter[] = [],
  limit = 50,
): Promise<VitalPageRow[]> {
  const { data, error } = await client(supabase).rpc("analytics_vitals_pages", {
    p_site: siteId,
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
    p_filters: filters,
    p_limit: limit,
  });
  if (error) throw new Error(`analytics_vitals_pages failed: ${error.message}`);
  const num = (v: unknown) => (v == null ? null : Number(v));
  return (data as Record<string, unknown>[]).map((r) => ({
    path: r.path as string,
    samples: Number(r.samples),
    lcp: num(r.lcp),
    cls: num(r.cls),
    inp: num(r.inp),
    fcp: num(r.fcp),
    ttfb: num(r.ttfb),
  }));
}

export type VitalBreakdownRow = { value: string; sample: number; p75: number | null; rating: VitalRating | null };

export async function getVitalsBreakdown(
  siteId: string,
  range: QueryRange,
  dimension: string,
  metric: VitalMetric,
  supabase?: SupabaseClient,
  filters: Filter[] = [],
  limit = 10,
): Promise<VitalBreakdownRow[]> {
  const { data, error } = await client(supabase).rpc("analytics_vitals_breakdown", {
    p_site: siteId,
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
    p_dimension: dimension,
    p_metric: metric,
    p_filters: filters,
    p_limit: limit,
  });
  if (error) throw new Error(`analytics_vitals_breakdown failed: ${error.message}`);
  return (data as Record<string, unknown>[]).map((r) => ({
    value: r.value as string,
    sample: Number(r.sample),
    p75: r.p75 == null ? null : Number(r.p75),
    rating: (r.rating as VitalRating) ?? null,
  }));
}

export type VitalAttributionRow = { element: string; count: number; p75: number | null };

export async function getVitalsAttribution(
  siteId: string,
  range: QueryRange,
  path: string,
  metric: VitalMetric,
  supabase?: SupabaseClient,
  filters: Filter[] = [],
): Promise<VitalAttributionRow[]> {
  const { data, error } = await client(supabase).rpc("analytics_vitals_attribution", {
    p_site: siteId,
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
    p_path: path,
    p_metric: metric,
    p_filters: filters,
  });
  if (error) throw new Error(`analytics_vitals_attribution failed: ${error.message}`);
  return (data as Record<string, unknown>[]).map((r) => ({
    element: r.element as string,
    count: Number(r.cnt),
    p75: r.p75 == null ? null : Number(r.p75),
  }));
}
