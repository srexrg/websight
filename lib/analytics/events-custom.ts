/**
 * Custom-events read layer (docs/redesign/14). Custom events = all events whose
 * name is not reserved (pageview/web_vital/error/identify). These reads power the
 * names table, per-event timeseries, the property explorer, and the occurrences
 * feed; an event_dictionary row is auto-upserted at ingest for governance.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import type { Filter } from "./filters";
import type { Granularity } from "./queries";

export type QueryRange = { from: Date; to: Date };

function client(override?: SupabaseClient): SupabaseClient {
  return override ?? createAdminClient();
}

export type EventName = {
  name: string;
  count: number;
  visitors: number;
  lastSeen: string;
  description: string | null;
  expectedProps: string[];
  dictLastSeen: string | null;
};

export async function getEventNames(
  siteId: string,
  range: QueryRange,
  supabase?: SupabaseClient,
  filters: Filter[] = [],
): Promise<EventName[]> {
  const { data, error } = await client(supabase).rpc("analytics_event_names", {
    p_site: siteId,
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
    p_filters: filters,
  });
  if (error) throw new Error(`analytics_event_names failed: ${error.message}`);
  return (data as Record<string, unknown>[]).map((r) => ({
    name: r.name as string,
    count: Number(r.count),
    visitors: Number(r.visitors),
    lastSeen: r.last_seen as string,
    description: (r.description as string) ?? null,
    expectedProps: Array.isArray(r.expected_props) ? (r.expected_props as string[]) : [],
    dictLastSeen: (r.dict_last_seen as string) ?? null,
  }));
}

export type EventTimeseriesPoint = { bucket: string; count: number; visitors: number };

export async function getEventTimeseries(
  siteId: string,
  name: string,
  range: QueryRange,
  granularity: Granularity = "day",
  supabase?: SupabaseClient,
  filters: Filter[] = [],
): Promise<EventTimeseriesPoint[]> {
  const { data, error } = await client(supabase).rpc("analytics_event_timeseries", {
    p_site: siteId,
    p_name: name,
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
    p_granularity: granularity,
    p_filters: filters,
  });
  if (error) throw new Error(`analytics_event_timeseries failed: ${error.message}`);
  return (data as Record<string, unknown>[]).map((r) => ({
    bucket: r.bucket as string,
    count: Number(r.count),
    visitors: Number(r.visitors),
  }));
}

export type PropKey = { key: string; count: number };

export async function getPropKeys(
  siteId: string,
  name: string,
  range: QueryRange,
  supabase?: SupabaseClient,
): Promise<PropKey[]> {
  const { data, error } = await client(supabase).rpc("analytics_event_prop_keys", {
    p_site: siteId,
    p_name: name,
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
  });
  if (error) throw new Error(`analytics_event_prop_keys failed: ${error.message}`);
  return (data as Record<string, unknown>[]).map((r) => ({ key: r.key as string, count: Number(r.count) }));
}

export type PropValue = { value: string; count: number; totalDistinct: number };

export async function getPropValues(
  siteId: string,
  name: string,
  key: string,
  range: QueryRange,
  supabase?: SupabaseClient,
  filters: Filter[] = [],
): Promise<PropValue[]> {
  const { data, error } = await client(supabase).rpc("analytics_event_prop_values", {
    p_site: siteId,
    p_name: name,
    p_key: key,
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
    p_filters: filters,
  });
  if (error) throw new Error(`analytics_event_prop_values failed: ${error.message}`);
  return (data as Record<string, unknown>[]).map((r) => ({
    value: r.value as string,
    count: Number(r.count),
    totalDistinct: Number(r.total_distinct),
  }));
}

export type EventOccurrence = {
  createdAt: string;
  sessionId: string | null;
  visitorId: string;
  path: string | null;
  country: string | null;
  props: Record<string, unknown> | null;
};

export async function getEventOccurrences(
  siteId: string,
  name: string,
  range: QueryRange,
  supabase?: SupabaseClient,
  filters: Filter[] = [],
): Promise<EventOccurrence[]> {
  const { data, error } = await client(supabase).rpc("analytics_event_occurrences", {
    p_site: siteId,
    p_name: name,
    p_from: range.from.toISOString(),
    p_to: range.to.toISOString(),
    p_filters: filters,
  });
  if (error) throw new Error(`analytics_event_occurrences failed: ${error.message}`);
  return (data as Record<string, unknown>[]).map((r) => ({
    createdAt: r.created_at as string,
    sessionId: (r.session_id as string) ?? null,
    visitorId: r.visitor_id as string,
    path: (r.path as string) ?? null,
    country: (r.country as string) ?? null,
    props: (r.props as Record<string, unknown>) ?? null,
  }));
}
