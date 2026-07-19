/**
 * Idle gating for session replay. rrweb keeps emitting DOM mutations in a
 * backgrounded or abandoned tab (timers, polling, re-renders, chat widgets), so
 * an untouched recording keeps uploading chunks and its wall-clock duration
 * grows until the hard cap - a 40-minute replay of mostly dead air.
 *
 * Mirrors PostHog's model: activity means *user interaction*, never mutations,
 * and after IDLE_MS without any we drop events until the visitor comes back.
 * Kept dependency-free (no rrweb import) so it stays cheap to bundle and can be
 * unit-tested on its own.
 */

// rrweb wire codes (EventType.IncrementalSnapshot / IncrementalSource).
const T_INCREMENTAL = 3;
// MouseMove, MouseInteraction, Scroll, ViewportResize, Input, TouchMove,
// MediaInteraction, Drag. Mutation (0) is deliberately absent: a page that
// redraws itself is not a visitor who is present.
const ACTIVE_SOURCES = [1, 2, 3, 4, 5, 6, 7, 12];

export const IDLE_MS = 5 * 60 * 1000;

// `data` is `unknown` on several rrweb event variants, so narrow at the read.
type RREvent = { type?: number; data?: unknown };

export function isInteractive(e: RREvent): boolean {
  const source = (e?.data as { source?: number } | undefined)?.source;
  return e?.type === T_INCREMENTAL && ACTIVE_SOURCES.indexOf(source as number) !== -1;
}

/**
 * Feed every rrweb event through `accept`: it returns false for events that
 * belong to idle time and should be dropped. Interaction resumes immediately.
 * `forceIdle` is for definitive away signals (tab hidden), where waiting out
 * the threshold would bank dead time we already know is dead.
 */
export function makeIdleGate(idleMs = IDLE_MS) {
  let lastActivity = Date.now();
  let idle = false;

  return {
    get idle() {
      return idle;
    },
    forceIdle() {
      idle = true;
    },
    /** @returns true when the event should be recorded. */
    accept(e: RREvent, now = Date.now()): boolean {
      if (isInteractive(e)) {
        lastActivity = now;
        idle = false;
        return true;
      }
      if (!idle && now - lastActivity > idleMs) idle = true;
      return !idle;
    },
  };
}
