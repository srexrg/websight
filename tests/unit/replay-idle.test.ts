/**
 * Replay idle gating. A recording must cover time the visitor is actually
 * there: rrweb keeps emitting DOM mutations in a backgrounded tab (timers,
 * polling, re-renders), which used to stretch replays toward the 60-minute cap
 * with dead air. Mirrors PostHog - only real user interaction counts as
 * activity, so mutations never keep a session alive.
 */
import { describe, expect, it } from "vitest";
import { IDLE_MS, isInteractive, makeIdleGate } from "../../packages/tracker/src/idle";

const move = { type: 3, data: { source: 1 } }; // MouseMove
const click = { type: 3, data: { source: 2 } }; // MouseInteraction
const mutation = { type: 3, data: { source: 0 } }; // Mutation - not user activity
const snapshot = { type: 2, data: {} }; // FullSnapshot

describe("isInteractive", () => {
  it("counts real user input", () => {
    expect(isInteractive(move)).toBe(true);
    expect(isInteractive(click)).toBe(true);
  });

  it("ignores DOM mutations and snapshots", () => {
    expect(isInteractive(mutation)).toBe(false);
    expect(isInteractive(snapshot)).toBe(false);
  });
});

describe("makeIdleGate", () => {
  it("keeps events while the visitor is active", () => {
    const g = makeIdleGate();
    expect(g.accept(move, 0)).toBe(true);
    expect(g.accept(mutation, 1000)).toBe(true); // mutation soon after input is real
  });

  it("drops background mutations once past the idle threshold", () => {
    const g = makeIdleGate();
    g.accept(move, 0);
    expect(g.accept(mutation, IDLE_MS + 1)).toBe(false);
    expect(g.idle).toBe(true);
    expect(g.accept(mutation, IDLE_MS + 60_000)).toBe(false);
  });

  it("resumes on the next interaction", () => {
    const g = makeIdleGate();
    g.accept(move, 0);
    g.accept(mutation, IDLE_MS + 1);
    expect(g.idle).toBe(true);
    expect(g.accept(click, IDLE_MS + 2000)).toBe(true);
    expect(g.idle).toBe(false);
  });

  it("goes idle immediately when the tab is hidden, and resumes on return", () => {
    const g = makeIdleGate();
    g.accept(move, 0);
    g.forceIdle();
    expect(g.idle).toBe(true);
    expect(g.accept(mutation, 1000)).toBe(false);
    expect(g.accept(click, 2000)).toBe(true);
    expect(g.idle).toBe(false);
  });
});
