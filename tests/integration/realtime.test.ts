/**
 * Realtime reads (plan 06) against a real Supabase stack. Self-skips without
 * a stack. Requires migration 20260705170000.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { localStack } from "../helpers/local-stack";
import {
  getLiveBreakdown,
  getLiveCount,
  getLiveTicker,
  getTimeseries,
} from "@/lib/analytics/queries";

const stack = localStack();
const runId = Date.now().toString(36);
const DOMAIN = `rt-${runId}.test`;

let db: SupabaseClient;
let siteId: string;

describe.skipIf(!stack)("realtime analytics (plan 06)", () => {
  beforeAll(async () => {
    db = createClient(stack!.url, stack!.serviceKey, { auth: { persistSession: false } });
    const { data: site, error } = await db
      .from("sites")
      .insert({ name: "realtime test", domains: [DOMAIN] })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    siteId = site.id;

    const now = new Date().toISOString();
    const old = new Date(Date.now() - 10 * 60_000).toISOString(); // outside 5-min window
    const ev = (over: Record<string, unknown>) => ({
      site_id: siteId,
      name: "pageview",
      created_at: now,
      ...over,
    });
    const { error: e2 } = await db.rpc("ingest_event", {
      p_events: [
        ev({ visitor_id: "live-1", path: "/", country: "US" }),
        ev({ visitor_id: "live-1", path: "/docs", country: "US" }),
        ev({ visitor_id: "live-2", path: "/", country: "DE" }),
        ev({ visitor_id: "old-1", path: "/old", country: "FR", created_at: old }),
      ],
    });
    if (e2) throw new Error(e2.message);
  });

  afterAll(async () => {
    if (!siteId) return;
    await db.from("events").delete().eq("site_id", siteId);
    await db.from("sessions").delete().eq("site_id", siteId);
    await db.from("rollup_daily").delete().eq("site_id", siteId);
    await db.from("sites").delete().eq("id", siteId);
  });

  it("live count includes only the last 5 minutes", async () => {
    expect(await getLiveCount(siteId, 5, [], db)).toBe(2);
    expect(await getLiveCount(siteId, 30, [], db)).toBe(3); // widened window
  });

  it("live count respects filters", async () => {
    const us = await getLiveCount(siteId, 5, [{ dim: "country", op: "is", values: ["US"] }], db);
    expect(us).toBe(1);
  });

  it("live breakdown returns active pages with distinct visitors", async () => {
    const pages = await getLiveBreakdown(siteId, "path", 5, 10, [], db);
    expect(pages.find((r) => r.value === "/")!.visitors).toBe(2);
    expect(pages.find((r) => r.value === "/docs")!.visitors).toBe(1);
    expect(pages.find((r) => r.value === "/old")).toBeUndefined();
    await expect(getLiveBreakdown(siteId, "visitor_id", 5, 10, [], db)).rejects.toThrow(
      /invalid live dimension/,
    );
  });

  it("ticker orders by event time and the id cursor fetches only new rows", async () => {
    const all = await getLiveTicker(siteId, 0, 50, db);
    expect(all.length).toBe(4);
    // newest event time first (the backdated row sorts last regardless of id)
    expect(all[0].created_at >= all.at(-1)!.created_at).toBe(true);
    expect(all.at(-1)!.path).toBe("/old");

    const ids = all.map((e) => e.id).sort((a, b) => b - a);
    expect(await getLiveTicker(siteId, ids[0], 50, db)).toEqual([]);
    const after = await getLiveTicker(siteId, ids[1], 50, db);
    expect(after.map((e) => e.id)).toEqual([ids[0]]);
  });

  it("minute granularity timeseries works for the live chart", async () => {
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 60_000);
    const series = await getTimeseries(siteId, { from, to }, "minute", db);
    expect(series.length).toBeGreaterThanOrEqual(29);
    expect(series.reduce((a, p) => a + p.pageviews, 0)).toBe(4);
  });
});
