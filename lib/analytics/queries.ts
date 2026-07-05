import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import type { Filter } from "./filters";

/**
 * THE analytics read layer (docs/redesign/02). Every dashboard fetch goes
 * through this module and nothing else imports the analytics tables directly,
 * so the storage engine can be swapped (e.g. ClickHouse) without touching UI.
 *
 * All SQL lives in repo-managed migrations as `analytics_*` RPCs; this module
 * types, times, and dispatches them.
 */

export type QueryRange = { from: Date; to: Date };
export type Granularity = "minute" | "hour" | "day" | "week" | "month";
export type BreakdownDimension =
  | "path"
  | "entry_path"
  | "exit_path"
  | "referrer_domain"
  | "channel"
  | "country"
  | "region"
  | "city"
  | "device_type"
  | "browser"
  | "os"
  | "lang"
  | "utm_source"
  | "utm_medium"
  | "utm_campaign"
  | "utm_term"
  | "utm_content";

export type Overview = {
  pageviews: number;
  visitors: number;
  sessions: number;
  /** 0..1 */
  bounceRate: number;
  avgDurationS: number;
};

export type TimeseriesPoint = {
  bucket: string;
  pageviews: number;
  visitors: number;
  sessions: number;
};

export type BreakdownRow = {
  value: string;
  pageviews: number;
  visitors: number;
};

/** Per-query timing logs (docs/redesign/23): enable with ANALYTICS_QUERY_LOG=1. */
async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    if (process.env.ANALYTICS_QUERY_LOG === "1") {
      console.log(
        `[analytics] ${label} took ${(performance.now() - start).toFixed(1)}ms`,
      );
    }
  }
}

function client(override?: SupabaseClient): SupabaseClient {
  return override ?? createAdminClient();
}

export async function getOverview(
  siteId: string,
  range: QueryRange,
  supabase?: SupabaseClient,
  filters: Filter[] = [],
): Promise<Overview> {
  return timed(`overview site=${siteId}`, async () => {
    const { data, error } = await client(supabase)
      .rpc("analytics_overview", {
        p_site: siteId,
        p_from: range.from.toISOString(),
        p_to: range.to.toISOString(),
        p_filters: filters,
      })
      .single();
    if (error) throw new Error(`analytics_overview failed: ${error.message}`);
    const row = data as {
      pageviews: number;
      visitors: number;
      sessions: number;
      bounce_rate: number;
      avg_duration_s: number;
    };
    return {
      pageviews: Number(row.pageviews),
      visitors: Number(row.visitors),
      sessions: Number(row.sessions),
      bounceRate: Number(row.bounce_rate),
      avgDurationS: Number(row.avg_duration_s),
    };
  });
}

export async function getTimeseries(
  siteId: string,
  range: QueryRange,
  granularity: Granularity = "day",
  supabase?: SupabaseClient,
  filters: Filter[] = [],
): Promise<TimeseriesPoint[]> {
  return timed(`timeseries site=${siteId} g=${granularity}`, async () => {
    const { data, error } = await client(supabase).rpc("analytics_timeseries", {
      p_site: siteId,
      p_from: range.from.toISOString(),
      p_to: range.to.toISOString(),
      p_granularity: granularity,
      p_filters: filters,
    });
    if (error) throw new Error(`analytics_timeseries failed: ${error.message}`);
    return (data as TimeseriesPoint[]).map((r) => ({
      bucket: r.bucket,
      pageviews: Number(r.pageviews),
      visitors: Number(r.visitors),
      sessions: Number(r.sessions),
    }));
  });
}

export async function getBreakdown(
  siteId: string,
  range: QueryRange,
  dimension: BreakdownDimension,
  limit = 10,
  supabase?: SupabaseClient,
  filters: Filter[] = [],
): Promise<BreakdownRow[]> {
  return timed(`breakdown site=${siteId} dim=${dimension}`, async () => {
    const { data, error } = await client(supabase).rpc("analytics_breakdown", {
      p_site: siteId,
      p_from: range.from.toISOString(),
      p_to: range.to.toISOString(),
      p_dimension: dimension,
      p_limit: limit,
      p_filters: filters,
    });
    if (error) throw new Error(`analytics_breakdown failed: ${error.message}`);
    return (data as BreakdownRow[]).map((r) => ({
      value: r.value,
      pageviews: Number(r.pageviews),
      visitors: Number(r.visitors),
    }));
  });
}

export type EventBreakdownRow = {
  name: string;
  count: number;
  visitors: number;
};

/** Custom (non-pageview) events by name for the Events screen. */
export async function getEventBreakdown(
  siteId: string,
  range: QueryRange,
  limit = 50,
  supabase?: SupabaseClient,
  filters: Filter[] = [],
): Promise<EventBreakdownRow[]> {
  return timed(`events site=${siteId}`, async () => {
    const { data, error } = await client(supabase).rpc("analytics_event_breakdown", {
      p_site: siteId,
      p_from: range.from.toISOString(),
      p_to: range.to.toISOString(),
      p_limit: limit,
      p_filters: filters,
    });
    if (error) throw new Error(`analytics_event_breakdown failed: ${error.message}`);
    return (data as EventBreakdownRow[]).map((r) => ({
      name: r.name,
      count: Number(r.count),
      visitors: Number(r.visitors),
    }));
  });
}

export type DimensionValue = { value: string; count: number };

/** Type-ahead values for the filter editor, ranked by traffic in range. */
export async function getDimensionValues(
  siteId: string,
  range: QueryRange,
  dimension: string,
  query = "",
  limit = 10,
  supabase?: SupabaseClient,
): Promise<DimensionValue[]> {
  return timed(`dimension-values site=${siteId} dim=${dimension}`, async () => {
    const { data, error } = await client(supabase).rpc("analytics_dimension_values", {
      p_site: siteId,
      p_from: range.from.toISOString(),
      p_to: range.to.toISOString(),
      p_dimension: dimension,
      p_query: query,
      p_limit: limit,
    });
    if (error) throw new Error(`analytics_dimension_values failed: ${error.message}`);
    return (data as DimensionValue[]).map((r) => ({ value: r.value, count: Number(r.count) }));
  });
}

// ------------------------------------------------------------------ realtime

/** Distinct sessionized visitors with an event in the last `minutes`. */
export async function getLiveCount(
  siteId: string,
  minutes = 5,
  filters: Filter[] = [],
  supabase?: SupabaseClient,
): Promise<number> {
  return timed(`live-count site=${siteId}`, async () => {
    const { data, error } = await client(supabase).rpc("analytics_live_count", {
      p_site: siteId,
      p_minutes: minutes,
      p_filters: filters,
    });
    if (error) throw new Error(`analytics_live_count failed: ${error.message}`);
    return Number(data ?? 0);
  });
}

export type LiveBreakdownRow = { value: string; visitors: number };

export async function getLiveBreakdown(
  siteId: string,
  dimension: string,
  minutes = 5,
  limit = 10,
  filters: Filter[] = [],
  supabase?: SupabaseClient,
): Promise<LiveBreakdownRow[]> {
  return timed(`live-breakdown site=${siteId} dim=${dimension}`, async () => {
    const { data, error } = await client(supabase).rpc("analytics_live_breakdown", {
      p_site: siteId,
      p_dimension: dimension,
      p_minutes: minutes,
      p_limit: limit,
      p_filters: filters,
    });
    if (error) throw new Error(`analytics_live_breakdown failed: ${error.message}`);
    return (data as LiveBreakdownRow[]).map((r) => ({
      value: r.value,
      visitors: Number(r.visitors),
    }));
  });
}

export type TickerEvent = {
  id: number;
  name: string;
  path: string;
  country: string | null;
  device_type: string | null;
  browser: string | null;
  referrer_domain: string | null;
  created_at: string;
};

/**
 * Reverse-chronological event feed. Cursor by `events.id` so the client only
 * fetches new rows. No visitor ids are exposed (privacy).
 */
export async function getLiveTicker(
  siteId: string,
  afterId = 0,
  limit = 50,
  supabase?: SupabaseClient,
): Promise<TickerEvent[]> {
  return timed(`live-ticker site=${siteId}`, async () => {
    const since = new Date(Date.now() - 30 * 60_000).toISOString();
    const { data, error } = await client(supabase)
      .from("events")
      .select("id, name, path, country, device_type, browser, referrer_domain, created_at")
      .eq("site_id", siteId)
      .gt("created_at", since)
      .gt("id", afterId)
      .not("session_id", "is", null)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`live ticker failed: ${error.message}`);
    return (data ?? []) as TickerEvent[];
  });
}
