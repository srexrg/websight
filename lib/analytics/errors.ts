/**
 * Error tracking read layer (docs/redesign/13). Errors are fingerprinted at
 * ingest (BEFORE-insert trigger) into error_groups; these reads join range-
 * scoped occurrences from `events` back to the group metadata + triage status.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import type { Filter } from "./filters";
import type { Granularity } from "./queries";

export type QueryRange = { from: Date; to: Date };
export type ErrorStatus = "open" | "resolved" | "ignored";

function client(override?: SupabaseClient): SupabaseClient {
  return override ?? createAdminClient();
}

export type ErrorGroup = {
  id: string;
  fingerprint: string;
  message: string;
  type: string;
  status: ErrorStatus;
  isExternal: boolean;
  regressed: boolean;
  dropped: number;
  firstSeen: string;
  lastSeen: string;
  occurrences: number;
  visitors: number;
  topBrowser: string | null;
};

export async function getErrorGroups(
  siteId: string,
  range: QueryRange,
  status: ErrorStatus | null,
  supabase?: SupabaseClient,
  filters: Filter[] = [],
  limit = 50,
): Promise<ErrorGroup[]> {
  const { data, error } = await client(supabase).rpc("analytics_error_groups", {
    p_site: siteId,
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
    p_status: status,
    p_filters: filters,
    p_limit: limit,
  });
  if (error) throw new Error(`analytics_error_groups failed: ${error.message}`);
  return (data as Record<string, unknown>[]).map((r) => ({
    id: r.id as string,
    fingerprint: r.fingerprint as string,
    message: (r.message as string) ?? "",
    type: (r.type as string) ?? "",
    status: r.status as ErrorStatus,
    isExternal: r.is_external as boolean,
    regressed: r.regressed as boolean,
    dropped: Number(r.dropped),
    firstSeen: r.first_seen as string,
    lastSeen: r.last_seen as string,
    occurrences: Number(r.occurrences),
    visitors: Number(r.visitors),
    topBrowser: (r.top_browser as string) ?? null,
  }));
}

/** Single group metadata (lifetime), owner-scoping done by the route. */
export async function getErrorGroup(
  siteId: string,
  groupId: string,
  supabase?: SupabaseClient,
): Promise<ErrorGroup | null> {
  const { data, error } = await client(supabase)
    .from("error_groups")
    .select("*")
    .eq("id", groupId)
    .eq("site_id", siteId)
    .maybeSingle();
  if (error) throw new Error(`error group fetch failed: ${error.message}`);
  if (!data) return null;
  return {
    id: data.id,
    fingerprint: data.fingerprint,
    message: data.message ?? "",
    type: data.type ?? "",
    status: data.status,
    isExternal: data.is_external,
    regressed: data.regressed,
    dropped: Number(data.dropped),
    firstSeen: data.first_seen,
    lastSeen: data.last_seen,
    occurrences: Number(data.occurrences),
    visitors: 0,
    topBrowser: null,
  };
}

export async function getErrorGroupStats(
  siteId: string,
  groupId: string,
  range: QueryRange,
  supabase?: SupabaseClient,
  filters: Filter[] = [],
): Promise<{ occurrences: number; visitors: number }> {
  const { data, error } = await client(supabase).rpc("analytics_error_group_stats", {
    p_site: siteId,
    p_group: groupId,
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
    p_filters: filters,
  });
  if (error) throw new Error(`analytics_error_group_stats failed: ${error.message}`);
  const row = (data as Record<string, unknown>[])[0];
  return { occurrences: Number(row?.occurrences ?? 0), visitors: Number(row?.visitors ?? 0) };
}

export type ErrorTimeseriesPoint = { bucket: string; count: number };

export async function getErrorTimeseries(
  siteId: string,
  groupId: string,
  range: QueryRange,
  granularity: Granularity = "day",
  supabase?: SupabaseClient,
  filters: Filter[] = [],
): Promise<ErrorTimeseriesPoint[]> {
  const { data, error } = await client(supabase).rpc("analytics_error_timeseries", {
    p_site: siteId,
    p_group: groupId,
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
    p_granularity: granularity,
    p_filters: filters,
  });
  if (error) throw new Error(`analytics_error_timeseries failed: ${error.message}`);
  return (data as Record<string, unknown>[]).map((r) => ({ bucket: r.bucket as string, count: Number(r.count) }));
}

export type ErrorBreakdownRow = { value: string; count: number };

export async function getErrorBreakdown(
  siteId: string,
  groupId: string,
  range: QueryRange,
  dimension: string,
  supabase?: SupabaseClient,
  filters: Filter[] = [],
  limit = 8,
): Promise<ErrorBreakdownRow[]> {
  const { data, error } = await client(supabase).rpc("analytics_error_breakdown", {
    p_site: siteId,
    p_group: groupId,
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
    p_dimension: dimension,
    p_filters: filters,
    p_limit: limit,
  });
  if (error) throw new Error(`analytics_error_breakdown failed: ${error.message}`);
  return (data as Record<string, unknown>[]).map((r) => ({ value: r.value as string, count: Number(r.count) }));
}

export type ErrorOccurrence = {
  createdAt: string;
  sessionId: string | null;
  visitorId: string;
  path: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  message: string | null;
  stack: string | null;
};

export async function getErrorOccurrences(
  siteId: string,
  groupId: string,
  range: QueryRange,
  supabase?: SupabaseClient,
  filters: Filter[] = [],
  limit = 20,
): Promise<ErrorOccurrence[]> {
  const { data, error } = await client(supabase).rpc("analytics_error_occurrences", {
    p_site: siteId,
    p_group: groupId,
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
    p_filters: filters,
    p_limit: limit,
  });
  if (error) throw new Error(`analytics_error_occurrences failed: ${error.message}`);
  return (data as Record<string, unknown>[]).map((r) => ({
    createdAt: r.created_at as string,
    sessionId: (r.session_id as string) ?? null,
    visitorId: r.visitor_id as string,
    path: (r.path as string) ?? null,
    browser: (r.browser as string) ?? null,
    os: (r.os as string) ?? null,
    country: (r.country as string) ?? null,
    message: (r.message as string) ?? null,
    stack: (r.stack as string) ?? null,
  }));
}
