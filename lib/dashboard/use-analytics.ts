"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  BreakdownDimension,
  BreakdownRow,
  EventBreakdownRow,
  Granularity,
  Overview,
  TimeseriesPoint,
} from "@/lib/analytics/queries";
import type { RangePreset } from "./range";

/**
 * TanStack Query hooks over GET /api/analytics/[site] (docs/redesign/03).
 * Keys are {site, kind, range, ...} so switching range/site refetches and
 * navigating back serves cache - no router.push-to-refetch hacks.
 */

async function fetchAnalytics<T>(site: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api/analytics/${site}?${qs}`);
  if (!res.ok) throw new Error(`analytics ${params.kind} failed (${res.status})`);
  return res.json();
}

const STALE_MS = 60_000;

export function useOverview(site: string, range: RangePreset) {
  return useQuery<Overview>({
    queryKey: ["analytics", site, "overview", range],
    queryFn: () => fetchAnalytics(site, { kind: "overview", range }),
    staleTime: STALE_MS,
  });
}

export function useTimeseries(site: string, range: RangePreset, granularity: Granularity) {
  return useQuery<TimeseriesPoint[]>({
    queryKey: ["analytics", site, "timeseries", range, granularity],
    queryFn: () => fetchAnalytics(site, { kind: "timeseries", range, granularity }),
    staleTime: STALE_MS,
  });
}

export function useBreakdown(
  site: string,
  range: RangePreset,
  dimension: BreakdownDimension,
  limit = 10,
) {
  return useQuery<BreakdownRow[]>({
    queryKey: ["analytics", site, "breakdown", dimension, range, limit],
    queryFn: () =>
      fetchAnalytics(site, { kind: "breakdown", range, dimension, limit: String(limit) }),
    staleTime: STALE_MS,
  });
}

export function useEventBreakdown(site: string, range: RangePreset, limit = 50) {
  return useQuery<EventBreakdownRow[]>({
    queryKey: ["analytics", site, "events", range, limit],
    queryFn: () => fetchAnalytics(site, { kind: "events", range, limit: String(limit) }),
    staleTime: STALE_MS,
  });
}
