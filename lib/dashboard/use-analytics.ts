"use client";

import { useQuery } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { useCallback, useMemo } from "react";
import type {
  BreakdownDimension,
  BreakdownRow,
  DimensionValue,
  EventBreakdownRow,
  Granularity,
  Overview,
  TimeseriesPoint,
} from "@/lib/analytics/queries";
import {
  addFilter as addFilterFn,
  decodeFilters,
  encodeFilters,
  removeFilter as removeFilterFn,
  type Filter,
  type FilterOp,
} from "@/lib/analytics/filters";
import {
  compareParser,
  comparisonRange,
  rangeParser,
  rangeToDates,
  type CompareMode,
  type RangePreset,
} from "./range";

/**
 * TanStack Query hooks over GET /api/analytics/[site] (docs/redesign/03-05).
 * Keys include {site, kind, range, from/to, filters} so URL state changes
 * refetch and back-navigation serves cache.
 */

export type AnalyticsParams = {
  range: RangePreset;
  /** Encoded filter string (docs/redesign/05 codec); "" = none. */
  f?: string;
  /** Explicit ISO range override (comparison periods). */
  from?: string;
  to?: string;
};

async function fetchAnalytics<T>(site: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "")),
  ).toString();
  const res = await fetch(`/api/analytics/${site}?${qs}`);
  if (!res.ok) throw new Error(`analytics ${params.kind} failed (${res.status})`);
  return res.json();
}

function base(p: AnalyticsParams): Record<string, string> {
  return {
    range: p.range,
    f: p.f ?? "",
    ...(p.from && p.to ? { from: p.from, to: p.to } : {}),
  };
}

const STALE_MS = 60_000;

export function useOverview(site: string, p: AnalyticsParams, enabled = true) {
  return useQuery<Overview>({
    queryKey: ["analytics", site, "overview", p],
    queryFn: () => fetchAnalytics(site, { kind: "overview", ...base(p) }),
    staleTime: STALE_MS,
    enabled,
  });
}

export function useTimeseries(
  site: string,
  p: AnalyticsParams,
  granularity: Granularity,
  enabled = true,
) {
  return useQuery<TimeseriesPoint[]>({
    queryKey: ["analytics", site, "timeseries", p, granularity],
    queryFn: () => fetchAnalytics(site, { kind: "timeseries", granularity, ...base(p) }),
    staleTime: STALE_MS,
    enabled,
  });
}

export function useBreakdown(
  site: string,
  p: AnalyticsParams,
  dimension: BreakdownDimension,
  limit = 10,
) {
  return useQuery<BreakdownRow[]>({
    queryKey: ["analytics", site, "breakdown", dimension, p, limit],
    queryFn: () =>
      fetchAnalytics(site, { kind: "breakdown", dimension, limit: String(limit), ...base(p) }),
    staleTime: STALE_MS,
  });
}

export function useEventBreakdown(site: string, p: AnalyticsParams, limit = 50) {
  return useQuery<EventBreakdownRow[]>({
    queryKey: ["analytics", site, "events", p, limit],
    queryFn: () => fetchAnalytics(site, { kind: "events", limit: String(limit), ...base(p) }),
    staleTime: STALE_MS,
  });
}

export function useDimensionValues(site: string, p: AnalyticsParams, dim: string, q: string) {
  return useQuery<DimensionValue[]>({
    queryKey: ["analytics", site, "dimension-values", dim, q, p.range],
    queryFn: () =>
      fetchAnalytics(site, { kind: "dimension-values", dimension: dim, q, range: p.range }),
    staleTime: STALE_MS,
    enabled: dim !== "",
  });
}

// ------------------------------------------------------------- shared state

/** URL-backed filters shared by every screen (docs/redesign/05). */
export function useFilters() {
  const [raw, setRaw] = useQueryState("f", { defaultValue: "", shallow: true });
  const filters = useMemo(() => decodeFilters(raw), [raw]);

  const set = useCallback(
    (next: Filter[]) => setRaw(next.length ? encodeFilters(next) : null),
    [setRaw],
  );
  const add = useCallback(
    (dim: string, value: string, op: FilterOp = "is") => set(addFilterFn(filters, dim, value, op)),
    [filters, set],
  );
  const removeAt = useCallback(
    (index: number) => set(removeFilterFn(filters, index)),
    [filters, set],
  );
  const clear = useCallback(() => set([]), [set]);

  return { filters, encoded: raw ?? "", set, add, removeAt, clear };
}

/** Range + comparison + filters, all URL-backed, as ready-to-use params. */
export function useDashboardParams() {
  const [range] = useQueryState("range", rangeParser);
  const [compare, setCompare] = useQueryState("compare", compareParser);
  const { encoded } = useFilters();

  const params: AnalyticsParams = useMemo(() => ({ range, f: encoded }), [range, encoded]);
  const compareParams: AnalyticsParams | null = useMemo(() => {
    const prev = comparisonRange(rangeToDates(range), compare as CompareMode);
    if (!prev) return null;
    return { range, f: encoded, from: prev.from.toISOString(), to: prev.to.toISOString() };
  }, [range, compare, encoded]);

  return { range, compare: compare as CompareMode, setCompare, params, compareParams };
}
