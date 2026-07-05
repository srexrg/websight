import { describe, expect, it } from "vitest";
import {
  addFilter,
  decodeFilters,
  encodeFilters,
  filterSummary,
  isValidDim,
  type Filter,
} from "@/lib/analytics/filters";
import { comparisonRange, relativeDelta } from "@/lib/dashboard/range";

describe("filter URL codec", () => {
  it("round-trips simple and multi-value filters", () => {
    const filters: Filter[] = [
      { dim: "country", op: "is", values: ["US", "DE"] },
      { dim: "path", op: "contains", values: ["/blog"] },
    ];
    expect(decodeFilters(encodeFilters(filters))).toEqual(filters);
  });

  it("escapes reserved characters in values", () => {
    const filters: Filter[] = [
      { dim: "path", op: "is", values: ["/a:b;c,d", "/100%"] },
      { dim: "referrer_domain", op: "is_not", values: ["ex,ample.com"] },
    ];
    const encoded = encodeFilters(filters);
    expect(decodeFilters(encoded)).toEqual(filters);
  });

  it("round-trips prop dims (dim itself contains a colon)", () => {
    const filters: Filter[] = [{ dim: "prop:plan", op: "is_not", values: ["free"] }];
    expect(decodeFilters(encodeFilters(filters))).toEqual(filters);
  });

  it("drops malformed segments, unknown dims and ops", () => {
    expect(decodeFilters("nonsense")).toEqual([]);
    expect(decodeFilters("visitor_id:is:x")).toEqual([]);
    expect(decodeFilters("country:matches:US")).toEqual([]);
    expect(decodeFilters("country:is:US;garbage;path:is:/x")).toEqual([
      { dim: "country", op: "is", values: ["US"] },
      { dim: "path", op: "is", values: ["/x"] },
    ]);
    expect(decodeFilters("")).toEqual([]);
    expect(decodeFilters(null)).toEqual([]);
  });

  it("caps values per filter at 20", () => {
    const values = Array.from({ length: 30 }, (_, i) => `v${i}`);
    const decoded = decodeFilters(encodeFilters([{ dim: "country", op: "is", values }]));
    expect(decoded[0].values).toHaveLength(20);
  });

  it("validates dims including prop form", () => {
    expect(isValidDim("country")).toBe(true);
    expect(isValidDim("prop:plan")).toBe(true);
    expect(isValidDim("prop:")).toBe(false);
    expect(isValidDim("session_id")).toBe(false);
  });

  it("click-to-filter merges values on the same dim+op", () => {
    let f = addFilter([], "country", "US");
    f = addFilter(f, "country", "DE");
    f = addFilter(f, "country", "US"); // duplicate ignored
    expect(f).toEqual([{ dim: "country", op: "is", values: ["US", "DE"] }]);
  });

  it("renders human summaries", () => {
    expect(filterSummary({ dim: "country", op: "is", values: ["US"] })).toBe("Country is US");
    expect(filterSummary({ dim: "path", op: "not_contains", values: ["/x"] })).toBe(
      "Page does not contain /x",
    );
  });
});

describe("comparison ranges", () => {
  const range = {
    from: new Date("2026-07-01T00:00:00Z"),
    to: new Date("2026-07-08T00:00:00Z"),
  };

  it("previous period is the immediately preceding equal-length window", () => {
    const prev = comparisonRange(range, "prev")!;
    expect(prev.from.toISOString()).toBe("2026-06-24T00:00:00.000Z");
    expect(prev.to.toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });

  it("year over year shifts both ends by one year", () => {
    const prev = comparisonRange(range, "yoy")!;
    expect(prev.from.toISOString()).toBe("2025-07-01T00:00:00.000Z");
    expect(prev.to.toISOString()).toBe("2025-07-08T00:00:00.000Z");
  });

  it("off mode returns null; zero previous yields null delta ('new')", () => {
    expect(comparisonRange(range, "off")).toBeNull();
    expect(relativeDelta(10, 0)).toBeNull();
    expect(relativeDelta(12, 10)).toBeCloseTo(0.2);
    expect(relativeDelta(8, 10)).toBeCloseTo(-0.2);
  });
});
