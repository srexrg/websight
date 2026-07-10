/**
 * Unit tests for the replay scrubber timeline derivation (lib/replay/markers.ts):
 * activity periods from the incremental stream, click / rage-click markers, and
 * the session-start / navigation / custom markers pulled from server events.
 */
import { describe, expect, it } from "vitest";
import {
  activityPeriods,
  buildReplayTimeline,
  clickMarkers,
  firstTimestamp,
  sessionEventMarkers,
} from "../../lib/replay/markers";

const T0 = 1_000_000;

// Incremental snapshot (type 3). Mouse interactions carry source 2 + a type code.
function incr(ts: number, extra: Record<string, unknown> = {}) {
  return { type: 3, timestamp: T0 + ts, data: { source: 1, ...extra } };
}
function click(ts: number, x = 10, y = 10) {
  return { type: 3, timestamp: T0 + ts, data: { source: 2, type: 2, x, y } };
}

describe("firstTimestamp", () => {
  it("returns the earliest timestamp regardless of order", () => {
    expect(firstTimestamp([incr(500), incr(0), incr(200)])).toBe(T0);
  });
  it("is 0 for an empty stream", () => {
    expect(firstTimestamp([])).toBe(0);
  });
});

describe("activityPeriods", () => {
  it("merges events closer than the gap into one period", () => {
    const events = [incr(0), incr(1000), incr(2000)];
    expect(activityPeriods(events, 10_000)).toEqual([{ startMs: 0, endMs: 2000 }]);
  });

  it("splits into two periods across a gap longer than the threshold", () => {
    const events = [incr(0), incr(1000), incr(9000), incr(9500)];
    expect(activityPeriods(events, 10_000, 5000)).toEqual([
      { startMs: 0, endMs: 1000 },
      { startMs: 9000, endMs: 9500 },
    ]);
  });

  it("clamps periods to the recording duration", () => {
    const events = [incr(0), incr(1000), incr(20_000)];
    // 20s event is beyond a 5s duration; it splits, and the tail clamps out.
    expect(activityPeriods(events, 5000, 5000)).toEqual([{ startMs: 0, endMs: 1000 }]);
  });

  it("returns nothing when there is no duration or no events", () => {
    expect(activityPeriods([incr(0)], 0)).toEqual([]);
    expect(activityPeriods([], 10_000)).toEqual([]);
  });
});

describe("clickMarkers", () => {
  it("emits one marker per isolated click, offset from the stream start", () => {
    // incr(0) anchors the recording start, as a real stream's first snapshot does.
    const markers = clickMarkers([incr(0), click(100), click(4000)]);
    expect(markers).toHaveLength(2);
    expect(markers.every((m) => m.kind === "click")).toBe(true);
    expect(markers[0].offsetMs).toBe(100);
  });

  it("collapses a tight burst into a single rage-click marker", () => {
    const markers = clickMarkers([click(0), click(200), click(400), click(600)]);
    expect(markers).toHaveLength(1);
    expect(markers[0].kind).toBe("rageclick");
    expect(markers[0].label).toContain("4×");
  });

  it("does not rage-collapse clicks spread beyond the radius", () => {
    const markers = clickMarkers([click(0, 0, 0), click(100, 300, 300), click(200, 600, 600)]);
    expect(markers.every((m) => m.kind === "click")).toBe(true);
    expect(markers).toHaveLength(3);
  });

  it("ignores non-click incremental events", () => {
    expect(clickMarkers([incr(0), incr(100, { source: 5 })])).toEqual([]);
  });
});

describe("sessionEventMarkers", () => {
  const start = T0;
  const evt = (ms: number, name: string, path: string | null = null, title: string | null = null) => ({
    id: `${name}-${ms}`,
    name,
    path,
    title,
    createdAt: new Date(start + ms).toISOString(),
  });

  it("labels the first pageview as the session start and the rest as navigation", () => {
    const markers = sessionEventMarkers(
      [evt(0, "pageview", "/", "Home"), evt(2000, "pageview", "/pricing")],
      start,
      10_000,
    );
    expect(markers.map((m) => m.kind)).toEqual(["start", "navigation"]);
    expect(markers[0].label).toBe("Home");
    expect(markers[1].label).toBe("/pricing");
  });

  it("treats non-pageview events as custom markers", () => {
    const markers = sessionEventMarkers([evt(500, "signup_click")], start, 10_000);
    expect(markers[0]).toMatchObject({ kind: "custom", label: "signup_click", offsetMs: 500 });
  });

  it("clamps pre-start skew to zero and drops events past the end", () => {
    // The -100ms pageview is the session-start with slight ingest skew: it stays
    // (clamped to 0) as the start marker; the 50s pageview is genuinely past the
    // 10s recording and is dropped.
    const markers = sessionEventMarkers(
      [evt(-100, "pageview", "/"), evt(50_000, "pageview")],
      start,
      10_000,
    );
    expect(markers).toEqual([{ offsetMs: 0, kind: "start", label: "/" }]);
  });
});

describe("buildReplayTimeline", () => {
  it("combines session and click markers, sorted by offset", () => {
    const { markers, activity } = buildReplayTimeline({
      rrwebEvents: [incr(0), click(1500), incr(2000)],
      sessionEvents: [
        {
          id: "pv",
          name: "pageview",
          path: "/",
          title: "Home",
          createdAt: new Date(T0).toISOString(),
        },
      ],
      startMs: T0,
      durationMs: 5000,
    });
    expect(markers.map((m) => m.kind)).toEqual(["start", "click"]);
    expect(activity).toEqual([{ startMs: 0, endMs: 2000 }]);
  });

  it("keeps notable markers and samples clicks when over the cap", () => {
    const clicks = Array.from({ length: 100 }, (_, i) => click(i * 30, 500, 500));
    // 100 clicks within a tight radius over 3s: many collapse to rage bursts.
    const { markers } = buildReplayTimeline({
      rrwebEvents: clicks,
      sessionEvents: undefined,
      startMs: T0,
      durationMs: 5000,
      maxMarkers: 10,
    });
    expect(markers.length).toBeLessThanOrEqual(10);
  });
});
