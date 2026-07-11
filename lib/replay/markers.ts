/**
 * Timeline derivation for the replay player (docs/redesign/24, Rybbit-parity
 * scrubber). Turns the two data sources the player already loads into the dots
 * and activity shading drawn on the scrubber:
 *
 *   - Raw rrweb events -> click / tap markers (with rage-click collapsing) and
 *     activity periods (stretches with interaction, so the gaps in between can
 *     be shaded as "inactive" - the same read the skip-inactive control acts on).
 *   - Server-side SessionEvents -> the session-start, navigation and custom-event
 *     markers, positioned by their timestamp relative to the recording start.
 *
 * Everything here is pure and clock-agnostic: offsets are milliseconds from the
 * recording start. rrweb event/source codes are inlined as literals so this
 * module carries no dependency on the rrweb bundle and stays unit-testable.
 */

// rrweb wire codes (see rrweb's EventType / IncrementalSource / MouseInteractions).
const T_INCREMENTAL = 3;
const SRC_MOUSE_INTERACTION = 2;
const MI_CLICK = 2;
const MI_DBLCLICK = 4;
const MI_TOUCHSTART = 7;

export type MarkerKind = "start" | "navigation" | "click" | "rageclick" | "custom";

/** One dot on the scrubber. `offsetMs` is measured from the recording start. */
export type ReplayMarker = {
  offsetMs: number;
  kind: MarkerKind;
  label: string;
};

/** A stretch of the recording that had interaction, as start/end offsets (ms). */
export type ActivityPeriod = { startMs: number; endMs: number };

type RRWebEvent = { type: number; timestamp: number; data?: Record<string, unknown> };

type SessionEventLike = {
  id: string;
  name: string;
  path: string | null;
  title: string | null;
  createdAt: string;
};

/** Earliest timestamp in an rrweb event stream, or 0 for an empty stream. */
export function firstTimestamp(events: readonly RRWebEvent[]): number {
  let min = Infinity;
  for (const e of events) {
    if (typeof e?.timestamp === "number" && e.timestamp < min) min = e.timestamp;
  }
  return Number.isFinite(min) ? min : 0;
}

/**
 * Contiguous stretches of interaction. Consecutive incremental snapshots less
 * than `gapMs` apart are treated as one active period; a larger gap closes the
 * period, and the space until the next event reads as inactive. Mirrors Rybbit's
 * 5s inactivity threshold. Offsets are clamped to [0, durationMs].
 */
export function activityPeriods(
  events: readonly RRWebEvent[],
  durationMs: number,
  gapMs = 5000,
): ActivityPeriod[] {
  if (durationMs <= 0) return [];
  const base = firstTimestamp(events);
  const stamps: number[] = [];
  for (const e of events) {
    if (e?.type === T_INCREMENTAL && typeof e.timestamp === "number") {
      stamps.push(e.timestamp - base);
    }
  }
  stamps.sort((a, b) => a - b);
  if (stamps.length === 0) return [];

  const periods: ActivityPeriod[] = [];
  let start = stamps[0];
  let prev = stamps[0];
  for (let i = 1; i < stamps.length; i++) {
    const t = stamps[i];
    if (t - prev > gapMs) {
      periods.push({ startMs: start, endMs: prev });
      start = t;
    }
    prev = t;
  }
  periods.push({ startMs: start, endMs: prev });

  // Clamp into range and drop anything fully outside it.
  return periods
    .map((p) => ({
      startMs: Math.max(0, Math.min(p.startMs, durationMs)),
      endMs: Math.max(0, Math.min(p.endMs, durationMs)),
    }))
    .filter((p) => p.endMs > p.startMs);
}

/**
 * Click / tap markers from the rrweb mouse-interaction stream. Bursts of >=3
 * clicks inside `rageWindowMs` and `ragePx` collapse into a single rage-click
 * marker (a frustration signal), matching Rybbit's heuristic.
 */
export function clickMarkers(
  events: readonly RRWebEvent[],
  { rageWindowMs = 1000, ragePx = 50 }: { rageWindowMs?: number; ragePx?: number } = {},
): ReplayMarker[] {
  const base = firstTimestamp(events);
  const clicks: { offsetMs: number; x: number; y: number }[] = [];
  for (const e of events) {
    if (e?.type !== T_INCREMENTAL || !e.data) continue;
    const d = e.data as { source?: number; type?: number; x?: number; y?: number };
    if (d.source !== SRC_MOUSE_INTERACTION) continue;
    if (d.type !== MI_CLICK && d.type !== MI_DBLCLICK && d.type !== MI_TOUCHSTART) continue;
    clicks.push({
      offsetMs: Math.max(0, e.timestamp - base),
      x: typeof d.x === "number" ? d.x : NaN,
      y: typeof d.y === "number" ? d.y : NaN,
    });
  }
  clicks.sort((a, b) => a.offsetMs - b.offsetMs);

  const markers: ReplayMarker[] = [];
  for (let i = 0; i < clicks.length; ) {
    // Grow a burst of clicks that stay within the rage window and radius.
    let j = i + 1;
    while (
      j < clicks.length &&
      clicks[j].offsetMs - clicks[i].offsetMs <= rageWindowMs &&
      near(clicks[i], clicks[j], ragePx)
    ) {
      j++;
    }
    const count = j - i;
    if (count >= 3) {
      markers.push({
        offsetMs: clicks[i].offsetMs,
        kind: "rageclick",
        label: `Rage click (${count}×)`,
      });
      i = j;
    } else {
      markers.push({ offsetMs: clicks[i].offsetMs, kind: "click", label: "Click" });
      i++;
    }
  }
  return markers;
}

function near(
  a: { x: number; y: number },
  b: { x: number; y: number },
  px: number,
): boolean {
  if (Number.isNaN(a.x) || Number.isNaN(b.x)) return true; // no coords -> treat as same spot
  return Math.abs(a.x - b.x) <= px && Math.abs(a.y - b.y) <= px;
}

/**
 * Session-start, navigation and custom-event markers from the server event
 * stream. The first pageview is the start; later pageviews are navigations;
 * anything else is a custom event. Offsets are relative to `startMs`.
 */
export function sessionEventMarkers(
  events: readonly SessionEventLike[] | undefined,
  startMs: number,
  durationMs: number,
): ReplayMarker[] {
  if (!events || events.length === 0) return [];
  const out: ReplayMarker[] = [];
  let seenPageview = false;
  for (const e of events) {
    const raw = new Date(e.createdAt).getTime() - startMs;
    if (raw > durationMs) continue; // genuinely past the end of the recording
    // A tiny negative offset is ingest/clock skew on the session-start pageview,
    // not a real pre-recording event; clamp it to the start rather than dropping
    // it, so the first pageview stays the session-start marker (matches the list).
    const offsetMs = Math.max(0, raw);
    if (e.name === "pageview") {
      if (!seenPageview) {
        seenPageview = true;
        out.push({ offsetMs, kind: "start", label: e.title || e.path || "Session start" });
      } else {
        out.push({ offsetMs, kind: "navigation", label: e.path || e.title || "Navigation" });
      }
    } else {
      out.push({ offsetMs, kind: "custom", label: e.name });
    }
  }
  return out;
}

/**
 * The full marker + activity set for a recording, capped so a busy session does
 * not turn the rail into a solid line. When over the cap, notable markers
 * (start, navigation, rage clicks, custom events) are always kept and plain
 * clicks are sampled by stride - the same priority Rybbit uses.
 */
export function buildReplayTimeline({
  rrwebEvents,
  sessionEvents,
  startMs,
  durationMs,
  maxMarkers = 160,
}: {
  rrwebEvents: readonly RRWebEvent[];
  sessionEvents: readonly SessionEventLike[] | undefined;
  startMs: number;
  durationMs: number;
  maxMarkers?: number;
}): { markers: ReplayMarker[]; activity: ActivityPeriod[] } {
  const activity = activityPeriods(rrwebEvents, durationMs);
  const all = [
    ...sessionEventMarkers(sessionEvents, startMs, durationMs),
    ...clickMarkers(rrwebEvents).filter((m) => m.offsetMs <= durationMs),
  ].sort((a, b) => a.offsetMs - b.offsetMs);

  const markers = all.length <= maxMarkers ? all : capMarkers(all, maxMarkers);
  return { markers, activity };
}

/** Keep every notable marker; sample plain clicks by stride to hit the cap. */
function capMarkers(markers: ReplayMarker[], max: number): ReplayMarker[] {
  const notable = markers.filter((m) => m.kind !== "click");
  const clicks = markers.filter((m) => m.kind === "click");
  const room = Math.max(0, max - notable.length);
  const kept =
    room >= clicks.length
      ? clicks
      : clicks.filter((_, i) => i % Math.ceil(clicks.length / Math.max(1, room)) === 0);
  return [...notable, ...kept].sort((a, b) => a.offsetMs - b.offsetMs);
}
