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

/** One row in the Sessions list (docs/redesign/07). */
export type SessionRow = {
  id: string;
  visitorId: string;
  userId: string | null;
  startedAt: string;
  lastEventAt: string;
  durationS: number;
  entryPath: string | null;
  exitPath: string | null;
  pageviews: number;
  events: number;
  isBounce: boolean;
  isOpen: boolean;
  referrerDomain: string | null;
  channel: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
};

export type SessionsCursor = { startedAt: string; id: string };
export type SessionsPage = { rows: SessionRow[]; nextCursor: SessionsCursor | null };

/** Lifetime aggregate for one visitor/user identity (docs/redesign/07 M3). */
export type ProfileRow = {
  profileKey: string;
  visitorId: string;
  userId: string | null;
  traits: Record<string, unknown>;
  sessions: number;
  pageviews: number;
  firstSeen: string;
  lastSeen: string;
  topCountry: string | null;
  topDevice: string | null;
};

export type ProfileEventFreq = { name: string; count: number };

/** One event in a session's timeline (docs/redesign/07 M2). */
export type SessionEvent = {
  id: string;
  name: string;
  path: string | null;
  title: string | null;
  createdAt: string;
  referrerDomain: string | null;
  props: Record<string, unknown> | null;
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

/**
 * Sessions list (docs/redesign/07). Keyset-paginated newest-first over the
 * `sessions` table; filters (05 model) match a session when it has an event
 * satisfying the filter. Returns the page plus the next cursor (null at end).
 */
export async function getSessions(
  siteId: string,
  range: QueryRange,
  cursor: SessionsCursor | null = null,
  limit = 50,
  supabase?: SupabaseClient,
  filters: Filter[] = [],
): Promise<SessionsPage> {
  return timed(`sessions site=${siteId}`, async () => {
    const { data, error } = await client(supabase).rpc("analytics_sessions_list", {
      p_site: siteId,
      p_from: range.from.toISOString(),
      p_to: range.to.toISOString(),
      p_cursor_started: cursor?.startedAt ?? null,
      p_cursor_id: cursor?.id ?? null,
      p_limit: limit,
      p_filters: filters,
    });
    if (error) throw new Error(`analytics_sessions_list failed: ${error.message}`);
    const rows: SessionRow[] = (data as Record<string, unknown>[]).map((r) => ({
      id: r.id as string,
      visitorId: r.visitor_id as string,
      userId: (r.user_id as string | null) ?? null,
      startedAt: r.started_at as string,
      lastEventAt: r.last_event_at as string,
      durationS: Number(r.duration_s),
      entryPath: (r.entry_path as string | null) ?? null,
      exitPath: (r.exit_path as string | null) ?? null,
      pageviews: Number(r.pageviews),
      events: Number(r.events),
      isBounce: Boolean(r.is_bounce),
      isOpen: Boolean(r.is_open),
      referrerDomain: (r.referrer_domain as string | null) ?? null,
      channel: (r.channel as string | null) ?? null,
      country: (r.country as string | null) ?? null,
      region: (r.region as string | null) ?? null,
      city: (r.city as string | null) ?? null,
      deviceType: (r.device_type as string | null) ?? null,
      browser: (r.browser as string | null) ?? null,
      os: (r.os as string | null) ?? null,
    }));
    const last = rows[rows.length - 1];
    const nextCursor =
      rows.length === limit && last ? { startedAt: last.startedAt, id: last.id } : null;
    return { rows, nextCursor };
  });
}

/** Ordered event timeline for one session (docs/redesign/07 M2). */
export async function getSessionEvents(
  siteId: string,
  sessionId: string,
  supabase?: SupabaseClient,
): Promise<SessionEvent[]> {
  return timed(`session-events site=${siteId}`, async () => {
    const { data, error } = await client(supabase).rpc("analytics_session_events", {
      p_site: siteId,
      p_session: sessionId,
    });
    if (error) throw new Error(`analytics_session_events failed: ${error.message}`);
    return (data as Record<string, unknown>[]).map((r) => ({
      id: String(r.id),
      name: r.name as string,
      path: (r.path as string | null) ?? null,
      title: (r.title as string | null) ?? null,
      createdAt: r.created_at as string,
      referrerDomain: (r.referrer_domain as string | null) ?? null,
      props: (r.props as Record<string, unknown> | null) ?? null,
    }));
  });
}

function mapProfile(r: Record<string, unknown>): ProfileRow {
  return {
    profileKey: r.profile_key as string,
    visitorId: r.visitor_id as string,
    userId: (r.user_id as string | null) ?? null,
    traits: (r.traits as Record<string, unknown> | null) ?? {},
    sessions: Number(r.sessions),
    pageviews: Number(r.pageviews),
    firstSeen: r.first_seen as string,
    lastSeen: r.last_seen as string,
    topCountry: (r.top_country as string | null) ?? null,
    topDevice: (r.top_device as string | null) ?? null,
  };
}

/** Profiles list: lifetime aggregate per identity (docs/redesign/07 M3). */
export async function getProfiles(
  siteId: string,
  search: string,
  limit = 50,
  offset = 0,
  supabase?: SupabaseClient,
): Promise<ProfileRow[]> {
  return timed(`profiles site=${siteId}`, async () => {
    const { data, error } = await client(supabase).rpc("analytics_profiles_list", {
      p_site: siteId,
      p_search: search || null,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) throw new Error(`analytics_profiles_list failed: ${error.message}`);
    return (data as Record<string, unknown>[]).map(mapProfile);
  });
}

/** One profile's lifetime aggregate + traits. Null if the key has no sessions. */
export async function getProfileDetail(
  siteId: string,
  key: string,
  supabase?: SupabaseClient,
): Promise<ProfileRow | null> {
  return timed(`profile-detail site=${siteId}`, async () => {
    const { data, error } = await client(supabase).rpc("analytics_profile_detail", {
      p_site: siteId,
      p_key: key,
    });
    if (error) throw new Error(`analytics_profile_detail failed: ${error.message}`);
    const rows = data as Record<string, unknown>[];
    return rows.length ? mapProfile(rows[0]) : null;
  });
}

/** Sessions belonging to one profile (newest first). */
export async function getProfileSessions(
  siteId: string,
  key: string,
  limit = 50,
  supabase?: SupabaseClient,
): Promise<SessionRow[]> {
  return timed(`profile-sessions site=${siteId}`, async () => {
    const { data, error } = await client(supabase).rpc("analytics_profile_sessions", {
      p_site: siteId,
      p_key: key,
      p_limit: limit,
    });
    if (error) throw new Error(`analytics_profile_sessions failed: ${error.message}`);
    return (data as Record<string, unknown>[]).map((r) => ({
      id: r.id as string,
      visitorId: r.visitor_id as string,
      userId: (r.user_id as string | null) ?? null,
      startedAt: r.started_at as string,
      lastEventAt: r.last_event_at as string,
      durationS: Number(r.duration_s),
      entryPath: (r.entry_path as string | null) ?? null,
      exitPath: (r.exit_path as string | null) ?? null,
      pageviews: Number(r.pageviews),
      events: Number(r.events),
      isBounce: Boolean(r.is_bounce),
      isOpen: Boolean(r.is_open),
      referrerDomain: (r.referrer_domain as string | null) ?? null,
      channel: (r.channel as string | null) ?? null,
      country: (r.country as string | null) ?? null,
      region: (r.region as string | null) ?? null,
      city: (r.city as string | null) ?? null,
      deviceType: (r.device_type as string | null) ?? null,
      browser: (r.browser as string | null) ?? null,
      os: (r.os as string | null) ?? null,
    }));
  });
}

/** Event-name frequency for one profile. */
export async function getProfileEventFreq(
  siteId: string,
  key: string,
  supabase?: SupabaseClient,
): Promise<ProfileEventFreq[]> {
  return timed(`profile-event-freq site=${siteId}`, async () => {
    const { data, error } = await client(supabase).rpc("analytics_profile_event_freq", {
      p_site: siteId,
      p_key: key,
    });
    if (error) throw new Error(`analytics_profile_event_freq failed: ${error.message}`);
    return (data as Record<string, unknown>[]).map((r) => ({
      name: r.name as string,
      count: Number(r.count),
    }));
  });
}
