/**
 * Cohort-retention grid assembly (plan 11). Verifies period derivation, cell
 * filling, cohort/previous basis, in-progress flagging, low-sample marking and
 * the size-weighted average, against hand-computed ground truth.
 */
import { describe, expect, it } from "vitest";
import {
  computeRetention,
  periodsBetween,
  type RetentionRow,
} from "@/lib/analytics/retention";

const NOW = "2026-02-02"; // a Monday; current weekly bucket

// Two weekly cohorts. Cohort W0 (2026-01-19): 10 identities, of which 6 return
// in W1 and 3 in W2 (=NOW, in progress). Cohort W1 (2026-01-26): 4 identities,
// 2 return in W1 (=NOW, in progress). "active == cohort" rows are period 0.
const ROWS: RetentionRow[] = [
  { cohort: "2026-01-19", active: "2026-01-19", cnt: 10, cohort_size: 10, now_bucket: NOW },
  { cohort: "2026-01-19", active: "2026-01-26", cnt: 6, cohort_size: 10, now_bucket: NOW },
  { cohort: "2026-01-19", active: "2026-02-02", cnt: 3, cohort_size: 10, now_bucket: NOW },
  { cohort: "2026-01-26", active: "2026-01-26", cnt: 4, cohort_size: 4, now_bucket: NOW },
  { cohort: "2026-01-26", active: "2026-02-02", cnt: 2, cohort_size: 4, now_bucket: NOW },
];

describe("periodsBetween", () => {
  it("counts whole intervals per unit", () => {
    expect(periodsBetween("2026-01-19", "2026-02-02", "week")).toBe(2);
    expect(periodsBetween("2026-01-19", "2026-01-22", "day")).toBe(3);
    expect(periodsBetween("2026-01-01", "2026-04-01", "month")).toBe(3);
    expect(periodsBetween("2025-11-01", "2026-02-01", "month")).toBe(3); // crosses year
  });
});

describe("computeRetention (weekly, cohort basis)", () => {
  const res = computeRetention(ROWS, { interval: "week", periods: 12, basis: "cohort" });

  it("orders cohorts newest-first", () => {
    expect(res.cohorts.map((c) => c.bucket)).toEqual(["2026-01-26", "2026-01-19"]);
  });

  it("fills period-0 at 100% and derives later cells", () => {
    const w0 = res.cohorts.find((c) => c.bucket === "2026-01-19")!;
    expect(w0.size).toBe(10);
    expect(w0.cells.map((c) => c.returned)).toEqual([10, 6, 3]);
    expect(w0.cells.map((c) => Math.round(c.pct * 100))).toEqual([100, 60, 30]);
  });

  it("flags only the now-bucket cell as in-progress", () => {
    const w0 = res.cohorts.find((c) => c.bucket === "2026-01-19")!;
    expect(w0.cells.map((c) => c.inProgress)).toEqual([false, false, true]);
    const w1 = res.cohorts.find((c) => c.bucket === "2026-01-26")!;
    expect(w1.cells.map((c) => c.inProgress)).toEqual([false, true]);
  });

  it("weights the average by cohort size, excluding in-progress cells", () => {
    // period 0: (10 + 4) / (10 + 4) = 1.0
    // period 1: only W0's period-1 is complete -> 6/10 = 0.6 (W1 period-1 is in progress)
    expect(res.weightedAvg[0]).toBeCloseTo(1);
    expect(res.weightedAvg[1]).toBeCloseTo(0.6);
    // period 2 is in-progress for W0 only -> excluded -> null
    expect(res.weightedAvg[2]).toBeNull();
  });

  it("reports totals and the now-bucket", () => {
    expect(res.totalVisitors).toBe(14);
    expect(res.maxPeriod).toBe(2);
    expect(res.nowBucket).toBe(NOW);
  });
});

describe("computeRetention (previous basis)", () => {
  it("expresses each cell relative to the prior period", () => {
    const res = computeRetention(ROWS, { interval: "week", periods: 12, basis: "previous" });
    const w0 = res.cohorts.find((c) => c.bucket === "2026-01-19")!;
    // period 1: 6/10 = 0.6; period 2: 3/6 = 0.5
    expect(w0.cells.map((c) => Math.round(c.pct * 100))).toEqual([100, 60, 50]);
  });
});

describe("computeRetention edge cases", () => {
  it("marks cohorts below the min sample as low-sample", () => {
    const res = computeRetention(ROWS, { interval: "week", periods: 12, basis: "cohort" });
    expect(res.cohorts.find((c) => c.bucket === "2026-01-26")!.lowSample).toBe(true); // size 4
    expect(res.cohorts.find((c) => c.bucket === "2026-01-19")!.lowSample).toBe(false); // size 10
  });

  it("returns an empty result for no rows", () => {
    const res = computeRetention([], { interval: "week", periods: 12, basis: "cohort" });
    expect(res.cohorts).toEqual([]);
    expect(res.totalVisitors).toBe(0);
  });

  it("caps rendered cohorts to the requested period count", () => {
    const many: RetentionRow[] = Array.from({ length: 20 }, (_, i) => {
      const d = String(i + 1).padStart(2, "0");
      return { cohort: `2026-01-${d}`, active: `2026-01-${d}`, cnt: 5, cohort_size: 5, now_bucket: "2026-01-25" };
    });
    const res = computeRetention(many, { interval: "day", periods: 12, basis: "cohort" });
    expect(res.cohorts.length).toBe(12);
    expect(res.cohorts[0].bucket).toBe("2026-01-20"); // newest kept
  });
});
