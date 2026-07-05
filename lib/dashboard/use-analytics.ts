"use client";

import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { useCallback, useMemo } from "react";
import type {
  BreakdownDimension,
  BreakdownRow,
  DimensionValue,
  EventBreakdownRow,
  Granularity,
  LiveBreakdownRow,
  FunnelResults,
  FunnelTtcBucket,
  FunnelVisitor,
  GoalSeriesPoint,
  GoalWithStats,
  Overview,
  ProfileEventFreq,
  ProfileRow,
  SessionEvent,
  SessionRow,
  SessionsCursor,
  SessionsPage,
  TickerEvent,
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
import type { Funnel } from "@/lib/analytics/funnels";
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

/** Infinite (keyset-paginated) sessions list for the Sessions screen (07). */
export function useSessions(site: string, p: AnalyticsParams, pageSize = 50) {
  return useInfiniteQuery<
    SessionsPage,
    Error,
    InfiniteData<SessionsPage>,
    unknown[],
    SessionsCursor | null
  >({
    queryKey: ["analytics", site, "sessions", base(p), pageSize],
    initialPageParam: null,
    queryFn: ({ pageParam }) =>
      fetchAnalytics<SessionsPage>(site, {
        kind: "sessions",
        limit: String(pageSize),
        ...(pageParam ? { cur_s: pageParam.startedAt, cur_id: pageParam.id } : {}),
        ...base(p),
      }),
    getNextPageParam: (last) => last.nextCursor,
    staleTime: STALE_MS,
  });
}

/** A session's event timeline; fetched on drawer open, polled while the session is live. */
export function useSessionEvents(site: string, sessionId: string | null, live = false) {
  return useQuery<SessionEvent[]>({
    queryKey: ["analytics", site, "session-events", sessionId],
    queryFn: () => fetchAnalytics(site, { kind: "session-events", session: sessionId! }),
    enabled: !!sessionId,
    staleTime: live ? 3_000 : STALE_MS,
    refetchInterval: live ? 5_000 : false,
  });
}

/** Warm a session's event timeline on row hover so the drawer opens instantly (M5). */
export function usePrefetchSessionEvents(site: string) {
  const qc = useQueryClient();
  return useCallback(
    (sessionId: string) => {
      qc.prefetchQuery({
        queryKey: ["analytics", site, "session-events", sessionId],
        queryFn: () => fetchAnalytics(site, { kind: "session-events", session: sessionId }),
        staleTime: STALE_MS,
      });
    },
    [qc, site],
  );
}

/** All active goals with conversion stats for the goals table (docs/redesign/08). */
export function useGoalsWithStats(site: string, p: AnalyticsParams) {
  return useQuery<GoalWithStats[]>({
    queryKey: ["analytics", site, "goals-stats", p],
    queryFn: () => fetchAnalytics(site, { kind: "goals-stats", ...base(p) }),
    staleTime: STALE_MS,
  });
}

export function useGoalTimeseries(site: string, p: AnalyticsParams, goalId: string) {
  return useQuery<GoalSeriesPoint[]>({
    queryKey: ["analytics", site, "goal-timeseries", goalId, p],
    queryFn: () =>
      fetchAnalytics(site, { kind: "goal-timeseries", goal: goalId, granularity: "day", ...base(p) }),
    enabled: !!goalId,
    staleTime: STALE_MS,
  });
}

/** Saved funnel definitions for a site (docs/redesign/09). */
export function useFunnels(site: string) {
  return useQuery<Funnel[]>({
    queryKey: ["funnels", site],
    queryFn: async () => {
      const res = await fetch(`/api/sites/${site}/funnels`);
      if (!res.ok) throw new Error(`funnels failed (${res.status})`);
      return res.json();
    },
    staleTime: STALE_MS,
  });
}

/** Computed results for one saved funnel over the range (range + filter aware). */
export function useFunnelResults(site: string, p: AnalyticsParams, funnelId: string) {
  return useQuery<FunnelResults>({
    queryKey: ["analytics", site, "funnel-results", funnelId, p],
    queryFn: () => fetchAnalytics(site, { kind: "funnel-results", funnel: funnelId, ...base(p) }),
    enabled: !!funnelId,
    staleTime: STALE_MS,
  });
}

/** Time-to-convert distribution buckets for a funnel's completers. */
export function useFunnelTimeToConvert(site: string, p: AnalyticsParams, funnelId: string) {
  return useQuery<FunnelTtcBucket[]>({
    queryKey: ["analytics", site, "funnel-ttc", funnelId, p],
    queryFn: () => fetchAnalytics(site, { kind: "funnel-ttc", funnel: funnelId, ...base(p) }),
    enabled: !!funnelId,
    staleTime: STALE_MS,
  });
}

/** Drill-down: visitors converted to / dropped off at a funnel step. */
export function useFunnelStepVisitors(
  site: string,
  p: AnalyticsParams,
  funnelId: string,
  step: number,
  outcome: "converted" | "dropped",
  enabled: boolean,
) {
  return useQuery<FunnelVisitor[]>({
    queryKey: ["analytics", site, "funnel-step-visitors", funnelId, step, outcome, p],
    queryFn: () =>
      fetchAnalytics(site, {
        kind: "funnel-step-visitors",
        funnel: funnelId,
        step: String(step),
        outcome,
        ...base(p),
      }),
    enabled,
    staleTime: STALE_MS,
  });
}

/** Profiles list (lifetime aggregates), searchable by user/visitor id. */
export function useProfiles(site: string, search: string) {
  return useQuery<ProfileRow[]>({
    queryKey: ["analytics", site, "profiles", search],
    queryFn: () =>
      fetchAnalytics(site, { kind: "profiles", q: search, limit: "100" }),
    staleTime: STALE_MS,
  });
}

export function useProfileDetail(site: string, key: string) {
  return useQuery<ProfileRow | null>({
    queryKey: ["analytics", site, "profile-detail", key],
    queryFn: () => fetchAnalytics(site, { kind: "profile-detail", key }),
    staleTime: STALE_MS,
  });
}

export function useProfileSessions(site: string, key: string) {
  return useQuery<SessionRow[]>({
    queryKey: ["analytics", site, "profile-sessions", key],
    queryFn: () => fetchAnalytics(site, { kind: "profile-sessions", key }),
    staleTime: STALE_MS,
  });
}

export function useProfileEventFreq(site: string, key: string) {
  return useQuery<ProfileEventFreq[]>({
    queryKey: ["analytics", site, "profile-event-freq", key],
    queryFn: () => fetchAnalytics(site, { kind: "profile-event-freq", key }),
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

// ------------------------------------------------------------------ realtime

/** Poll cadences per docs/redesign/06; TanStack pauses in background tabs. */
export function useLiveCount(site: string, f = "") {
  return useQuery<{ count: number }>({
    queryKey: ["analytics", site, "live-count", f],
    queryFn: () => fetchAnalytics(site, { kind: "live-count", range: "24h", f }),
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
}

export function useLiveBreakdown(site: string, dim: string, f = "", limit = 10) {
  return useQuery<LiveBreakdownRow[]>({
    queryKey: ["analytics", site, "live-breakdown", dim, f, limit],
    queryFn: () =>
      fetchAnalytics(site, {
        kind: "live-breakdown",
        dimension: dim,
        limit: String(limit),
        range: "24h",
        f,
      }),
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}

export function useLiveSeries(site: string, f = "") {
  return useQuery<TimeseriesPoint[]>({
    queryKey: ["analytics", site, "live-series", f],
    queryFn: () => fetchAnalytics(site, { kind: "live-series", range: "24h", f }),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useLiveTicker(site: string) {
  return useQuery<TickerEvent[]>({
    queryKey: ["analytics", site, "live-ticker"],
    queryFn: async () => {
      const rows = await fetchAnalytics<TickerEvent[]>(site, {
        kind: "live-ticker",
        range: "24h",
        limit: "50",
      });
      return rows;
    },
    refetchInterval: 5_000,
    staleTime: 2_500,
  });
}
