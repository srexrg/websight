/**
 * Cohort retention (docs/redesign/11). The SQL RPC (`analytics_retention`)
 * returns tidy rows of `(cohort, active, cnt, cohort_size, now_bucket)` where
 * cohort/active are 'YYYY-MM-DD' wall-clock bucket starts in the site timezone.
 * This module turns those into the triangle grid: it derives each cell's period
 * index (bucket arithmetic on the fixed-width date strings, so no timezone math
 * is needed here), fills the empty cells, flags the in-progress interval and
 * low-sample cohorts, and computes the size-weighted average retention curve.
 */

export type RetentionInterval = "day" | "week" | "month";
/** How a cell's percentage is expressed. */
export type RetentionBasis = "cohort" | "previous";

export type RetentionParams = {
  interval: RetentionInterval;
  /** Number of period columns / cohorts to keep (newest). */
  periods: number;
  basis: RetentionBasis;
  entryGoal?: string | null;
  returnGoal?: string | null;
};

export type RetentionCell = {
  period: number;
  returned: number;
  /** Fraction 0..1 per the requested basis. */
  pct: number;
  /** The cell's target interval is the current, still-incomplete one. */
  inProgress: boolean;
  /** 'YYYY-MM-DD' start of the cell's target interval; "" for empty cells. */
  bucket: string;
};

export type RetentionCohort = {
  /** 'YYYY-MM-DD' start of the cohort's interval (site timezone). */
  bucket: string;
  size: number;
  /** Cohort smaller than the min sample - percentages are noisy. */
  lowSample: boolean;
  cells: RetentionCell[];
};

export type RetentionResult = {
  interval: RetentionInterval;
  /** Newest cohort first. */
  cohorts: RetentionCohort[];
  /** Size-weighted retention (cohort basis) per period; null where no data. */
  weightedAvg: (number | null)[];
  /** Widest cohort row (number of period columns present). */
  maxPeriod: number;
  totalVisitors: number;
  /** Current (in-progress) bucket, 'YYYY-MM-DD'. */
  nowBucket: string;
};

export type RetentionRow = {
  cohort: string;
  active: string;
  cnt: number;
  cohort_size: number;
  now_bucket: string;
};

/** Cohorts smaller than this render hatched - tiny-sample percentages mislead. */
export const MIN_COHORT = 10;

const DAY_MS = 86_400_000;

/** Whole number of `interval` steps from bucket `a` to bucket `b` (a <= b). */
export function periodsBetween(a: string, b: string, interval: RetentionInterval): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  if (interval === "month") return (by - ay) * 12 + (bm - am);
  const days = Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / DAY_MS);
  return interval === "week" ? Math.round(days / 7) : days;
}

export function computeRetention(rows: RetentionRow[], params: RetentionParams): RetentionResult {
  const { interval, periods, basis } = params;
  if (rows.length === 0) {
    return { interval, cohorts: [], weightedAvg: [], maxPeriod: 0, totalVisitors: 0, nowBucket: "" };
  }
  const nowBucket = rows[0].now_bucket;

  // Group returned-counts by cohort, keyed by period index (with the target
  // bucket string, so a cell click can drill down without recomputing dates).
  const byCohort = new Map<string, { size: number; returned: Map<number, { cnt: number; bucket: string }> }>();
  for (const r of rows) {
    let c = byCohort.get(r.cohort);
    if (!c) {
      c = { size: r.cohort_size, returned: new Map() };
      byCohort.set(r.cohort, c);
    }
    const p = periodsBetween(r.cohort, r.active, interval);
    if (p >= 0) {
      const prev = c.returned.get(p);
      c.returned.set(p, { cnt: (prev?.cnt ?? 0) + r.cnt, bucket: r.active });
    }
  }

  // Newest cohort first, capped to the requested number of rows.
  const buckets = [...byCohort.keys()].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0)).slice(0, periods);

  const cohorts: RetentionCohort[] = buckets.map((bucket) => {
    const c = byCohort.get(bucket)!;
    // Raw distance to the current bucket; the rendered row stops at the capped
    // column. A cell is in-progress only if its target bucket IS the now-bucket.
    const rawCurrent = periodsBetween(bucket, nowBucket, interval);
    const currentPeriod = Math.min(rawCurrent, periods - 1);
    const cells: RetentionCell[] = [];
    for (let p = 0; p <= currentPeriod; p++) {
      const hit = c.returned.get(p);
      const returned = hit?.cnt ?? 0;
      let pct: number;
      if (basis === "previous") {
        const prev = p === 0 ? c.size : (c.returned.get(p - 1)?.cnt ?? 0);
        pct = prev > 0 ? returned / prev : 0;
      } else {
        pct = c.size > 0 ? returned / c.size : 0;
      }
      cells.push({ period: p, returned, pct, inProgress: p === rawCurrent, bucket: hit?.bucket ?? "" });
    }
    return { bucket, size: c.size, lowSample: c.size < MIN_COHORT, cells };
  });

  const maxPeriod = cohorts.reduce((m, c) => Math.max(m, c.cells.length - 1), 0);

  // Size-weighted average retention (cohort basis), excluding in-progress cells.
  const weightedAvg: (number | null)[] = [];
  for (let p = 0; p <= maxPeriod; p++) {
    let num = 0;
    let den = 0;
    for (const c of cohorts) {
      const cell = c.cells[p];
      if (!cell || cell.inProgress) continue;
      num += cell.returned;
      den += c.size;
    }
    weightedAvg.push(den > 0 ? num / den : null);
  }

  const totalVisitors = cohorts.reduce((s, c) => s + c.size, 0);
  return { interval, cohorts, weightedAvg, maxPeriod, totalVisitors, nowBucket };
}
