/**
 * Filtered analytics reads (plans 04+05) against a real Supabase stack:
 * the _analytics_where builder, filtered overview/timeseries/breakdown,
 * entry/exit dims, prop filters, dimension type-ahead, and injection safety.
 * Self-skips without a stack. Requires migration 20260705150000.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { localStack } from "../helpers/local-stack";
import type { Filter } from "@/lib/analytics/filters";
import {
  getBreakdown,
  getDimensionValues,
  getOverview,
  getTimeseries,
} from "@/lib/analytics/queries";

const stack = localStack();
const runId = Date.now().toString(36);
const DOMAIN = `filters-${runId}.test`;

let db: SupabaseClient;
let siteId: string;

describe.skipIf(!stack)("filtered analytics (plans 04+05)", () => {
  beforeAll(async () => {
    db = createClient(stack!.url, stack!.serviceKey, { auth: { persistSession: false } });
    const { data: site, error } = await db
      .from("sites")
      .insert({ name: "filters test", domains: [DOMAIN] })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    siteId = site.id;

    // Two visitors, two sessions, ingested through the real pipeline RPC.
    const now = new Date().toISOString();
    const ev = (over: Record<string, unknown>) => ({
      site_id: siteId,
      name: "pageview",
      created_at: now,
      ...over,
    });
    const { error: e2 } = await db.rpc("ingest_event", {
      p_events: [
        ev({ visitor_id: "vis-us", path: "/", country: "US", channel: "Direct", browser: "Chrome" }),
        ev({ visitor_id: "vis-us", path: "/pricing", country: "US", channel: "Direct", browser: "Chrome" }),
        ev({
          visitor_id: "vis-us",
          name: "signup",
          path: "/pricing",
          country: "US",
          channel: "Direct",
          browser: "Chrome",
          props: { plan: "pro" },
        }),
        ev({ visitor_id: "vis-de", path: "/blog", country: "DE", channel: "Social", browser: "Safari" }),
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

  const range = {
    from: new Date(Date.now() - 3600_000),
    to: new Date(Date.now() + 3600_000),
  };
  const f = (dim: string, op: Filter["op"], ...values: string[]): Filter[] => [
    { dim, op, values },
  ];

  it("unfiltered overview matches the seeded traffic", async () => {
    const o = await getOverview(siteId, range, db);
    expect(o.pageviews).toBe(3);
    expect(o.visitors).toBe(2);
    expect(o.sessions).toBe(2);
  });

  it("'is' filter scopes all metrics to matching events' sessions", async () => {
    const o = await getOverview(siteId, range, db, f("country", "is", "US"));
    expect(o.pageviews).toBe(2);
    expect(o.visitors).toBe(1);
    expect(o.sessions).toBe(1);
    expect(o.bounceRate).toBe(0); // the US session has 2 pageviews
  });

  it("'is_not' and multi-value 'is' behave correctly", async () => {
    const not = await getOverview(siteId, range, db, f("country", "is_not", "US"));
    expect(not.visitors).toBe(1);
    const both = await getOverview(siteId, range, db, f("country", "is", "US", "DE"));
    expect(both.visitors).toBe(2);
  });

  it("'contains' matches substrings; prop filters hit props->>key", async () => {
    const blog = await getOverview(siteId, range, db, f("path", "contains", "blog"));
    expect(blog.pageviews).toBe(1);
    const pro = await getOverview(siteId, range, db, f("prop:plan", "is", "pro"));
    expect(pro.sessions).toBe(1); // the signup event's session
  });

  it("filters stack with AND semantics", async () => {
    const o = await getOverview(siteId, range, db, [
      { dim: "country", op: "is", values: ["US"] },
      { dim: "path", op: "contains", values: ["blog"] },
    ]);
    expect(o.pageviews).toBe(0);
  });

  it("filtered breakdown + timeseries stay consistent", async () => {
    const rows = await getBreakdown(siteId, range, "path", 10, db, f("country", "is", "US"));
    expect(rows.map((r) => r.value).sort()).toEqual(["/", "/pricing"]);
    const series = await getTimeseries(siteId, range, "hour", db, f("country", "is", "US"));
    expect(series.reduce((a, p) => a + p.pageviews, 0)).toBe(2);
  });

  it("entry_path is a session-scoped dimension (breakdown + filter)", async () => {
    const entries = await getBreakdown(siteId, range, "entry_path", 10, db);
    expect(entries.map((r) => r.value).sort()).toEqual(["/", "/blog"]);
    const o = await getOverview(siteId, range, db, f("entry_path", "is", "/"));
    expect(o.sessions).toBe(1);
    expect(o.pageviews).toBe(2); // both pageviews of the session that entered at /
  });

  it("dimension type-ahead ranks by traffic and honors the search query", async () => {
    const all = await getDimensionValues(siteId, range, "path", "", 10, db);
    expect(all[0]).toEqual({ value: "/pricing", count: 2 }); // pageview + signup
    const only = await getDimensionValues(siteId, range, "path", "blog", 10, db);
    expect(only).toEqual([{ value: "/blog", count: 1 }]);
  });

  it("rejects unknown dims/ops and quotes hostile values safely", async () => {
    await expect(
      getOverview(siteId, range, db, f("session_id", "is", "x")),
    ).rejects.toThrow(/invalid filter dimension/);
    await expect(
      getOverview(siteId, range, db, [
        { dim: "country", op: "matches" as Filter["op"], values: ["x"] },
      ]),
    ).rejects.toThrow(/invalid filter operator/);
    // hostile value must be treated as a literal, not SQL
    const o = await getOverview(siteId, range, db, f("path", "is", "'); drop table events; --"));
    expect(o.pageviews).toBe(0);
    const { count } = await db.from("events").select("*", { count: "exact", head: true }).eq("site_id", siteId);
    expect(count).toBe(4);
  });
});
