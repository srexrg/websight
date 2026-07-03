/**
 * End-to-end pipeline tests against the local Supabase stack
 * (`npx supabase start`). The suite self-skips when no stack is running.
 *
 * Covers plan 02 milestones 1-3: ingest route (v2 + legacy dual-write),
 * sessionization, bounce accounting, rollups, dedupe, bot filtering,
 * unregistered-site drops, and the queries.ts read layer.
 */
import { NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { localStack } from "../helpers/local-stack";

const stack = localStack();

const CHROME_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const runId = Date.now().toString(36);
const V2_DOMAIN = `v2-${runId}.test`;
const LEGACY_DOMAIN = `legacy-${runId}.test`;

let db: SupabaseClient;
let v2SiteId: string;
let legacySiteId: string;
let apiUserId: string;
const apiKey = `test-api-key-${runId}`;

function trackRequest(
  body: unknown,
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest("http://localhost:3000/api/track", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "user-agent": CHROME_UA,
      "x-forwarded-for": "203.0.113.10",
      "x-vercel-ip-country": "DE",
      "x-vercel-ip-country-region": "BE",
      "x-vercel-ip-city": "Berlin",
      ...headers,
    },
  });
}

describe.skipIf(!stack)("ingestion pipeline (local Supabase)", () => {
  beforeAll(async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = stack!.url;
    process.env.SUPABASE_SERVICE_ROLE_KEY = stack!.serviceKey;

    db = createClient(stack!.url, stack!.serviceKey, {
      auth: { persistSession: false },
    });

    const { data: v2Site, error: e1 } = await db
      .from("sites")
      .insert({ name: "v2 test site", domains: [V2_DOMAIN] })
      .select("id")
      .single();
    if (e1) throw new Error(e1.message);
    v2SiteId = v2Site.id;

    const { data: legacySite, error: e2 } = await db
      .from("sites")
      .insert({ name: "legacy test site", domains: [LEGACY_DOMAIN] })
      .select("id")
      .single();
    if (e2) throw new Error(e2.message);
    legacySiteId = legacySite.id;

    apiUserId = crypto.randomUUID();
    const { error: e3 } = await db.from("users").insert({
      id: apiUserId,
      email: `it-${runId}@test.local`,
      api: apiKey,
    });
    if (e3) throw new Error(e3.message);
  });

  afterAll(async () => {
    if (!db) return;
    for (const siteId of [v2SiteId, legacySiteId]) {
      if (!siteId) continue;
      await db.from("events").delete().eq("site_id", siteId);
      await db.from("sessions").delete().eq("site_id", siteId);
      await db.from("rollup_daily").delete().eq("site_id", siteId);
      await db.from("sites").delete().eq("id", siteId);
    }
    await db.from("visits").delete().eq("website_id", LEGACY_DOMAIN);
    await db.from("page_views").delete().eq("domain", LEGACY_DOMAIN);
    await db.from("daily_stats").delete().eq("domain", LEGACY_DOMAIN);
    await db.from("events_legacy").delete().eq("website_id", LEGACY_DOMAIN);
    if (apiUserId) await db.from("users").delete().eq("id", apiUserId);
  });

  it("accepts a v2 pageview, enriches it, and opens a session", async () => {
    const { POST } = await import("@/app/api/track/route");
    const res = await POST(
      trackRequest({
        site: V2_DOMAIN,
        name: "pageview",
        url: `https://${V2_DOMAIN}/pricing?utm_source=news&utm_medium=email&secret=1`,
        ref: "https://www.google.com/",
        title: "Pricing",
        w: 1440,
        h: 900,
        lang: "en-US",
      }),
    );
    expect(res.status).toBe(202);
    expect((await res.json()).accepted).toBe(1);

    const { data: events } = await db
      .from("events")
      .select("*")
      .eq("site_id", v2SiteId);
    expect(events).toHaveLength(1);
    const ev = events![0];
    expect(ev.path).toBe("/pricing");
    expect(ev.url_query).toEqual({ utm_source: "news", utm_medium: "email" });
    expect(ev.referrer_domain).toBe("google.com");
    expect(ev.channel).toBe("Email"); // utm_medium=email beats the search referrer
    expect(ev.country).toBe("DE");
    expect(ev.region).toBe("BE");
    expect(ev.city).toBe("Berlin");
    expect(ev.browser).toBe("Chrome");
    expect(ev.device_type).toBe("desktop");
    expect(ev.visitor_id).toMatch(/^[0-9a-f]{32}$/); // stateless hash, no raw ip/ua
    expect(ev.session_id).toBeTruthy();

    const { data: sessions } = await db
      .from("sessions")
      .select("*")
      .eq("site_id", v2SiteId);
    expect(sessions).toHaveLength(1);
    expect(sessions![0].pageviews).toBe(1);
    expect(sessions![0].is_bounce).toBe(true);
    expect(sessions![0].entry_path).toBe("/pricing");
  });

  it("merges a second pageview from the same visitor into the session", async () => {
    const { POST } = await import("@/app/api/track/route");
    const res = await POST(
      trackRequest({
        site: V2_DOMAIN,
        name: "pageview",
        url: `https://${V2_DOMAIN}/docs`,
      }),
    );
    expect(res.status).toBe(202);

    const { data: sessions } = await db
      .from("sessions")
      .select("*")
      .eq("site_id", v2SiteId);
    expect(sessions).toHaveLength(1); // same ip+ua -> same stateless visitor
    expect(sessions![0].pageviews).toBe(2);
    expect(sessions![0].is_bounce).toBe(false);
    expect(sessions![0].exit_path).toBe("/docs");

    const { data: rollup } = await db
      .from("rollup_daily")
      .select("*")
      .eq("site_id", v2SiteId);
    expect(rollup).toHaveLength(1);
    expect(rollup![0].pageviews).toBe(2);
    expect(rollup![0].sessions).toBe(1);
    expect(rollup![0].bounces).toBe(0); // decremented on second pageview
  });

  it("dedupes replayed pageview beacons within 5 seconds", async () => {
    const { POST } = await import("@/app/api/track/route");
    const res = await POST(
      trackRequest({
        site: V2_DOMAIN,
        name: "pageview",
        url: `https://${V2_DOMAIN}/docs`,
      }),
    );
    expect((await res.json()).accepted).toBe(0);
  });

  it("tracks a second visitor separately and accepts batched custom events", async () => {
    const { POST } = await import("@/app/api/track/route");
    const res = await POST(
      trackRequest(
        [
          {
            site: V2_DOMAIN,
            name: "pageview",
            url: `https://${V2_DOMAIN}/`,
          },
          {
            site: V2_DOMAIN,
            name: "signup",
            url: `https://${V2_DOMAIN}/`,
            props: { plan: "pro" },
          },
          {
            site: "unregistered.test",
            name: "pageview",
            url: "https://unregistered.test/",
          },
        ],
        { "x-forwarded-for": "198.51.100.7" },
      ),
    );
    expect((await res.json()).accepted).toBe(2); // unregistered site dropped

    const { data: sessions } = await db
      .from("sessions")
      .select("*")
      .eq("site_id", v2SiteId)
      .order("started_at");
    expect(sessions).toHaveLength(2);
    const second = sessions!.find((s) => s.pageviews === 1)!;
    expect(second.events).toBe(2); // pageview + custom event share the session

    const { data: custom } = await db
      .from("events")
      .select("*")
      .eq("site_id", v2SiteId)
      .eq("name", "signup");
    expect(custom).toHaveLength(1);
    expect(custom![0].props).toEqual({ plan: "pro" });
  });

  it("drops bot traffic before any database work", async () => {
    const { POST } = await import("@/app/api/track/route");
    const res = await POST(
      trackRequest(
        { site: V2_DOMAIN, name: "pageview", url: `https://${V2_DOMAIN}/bot` },
        { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" },
      ),
    );
    expect(res.status).toBe(202);
    expect((await res.json()).dropped).toBe("bot");

    const { data } = await db
      .from("events")
      .select("id")
      .eq("site_id", v2SiteId)
      .eq("path", "/bot");
    expect(data).toHaveLength(0);
  });

  it("keeps legacy tracker payloads working and dual-writes into the new tables", async () => {
    const { POST } = await import("@/app/api/track/route");

    const sessionStart = await POST(
      trackRequest({
        domain: LEGACY_DOMAIN,
        url: `https://${LEGACY_DOMAIN}/`,
        event: "session_start",
        visitor_id: "legacy-visitor-1",
        session_id: "legacy-session-1",
        user_agent: CHROME_UA,
        screen: { width: 1280, height: 800 },
        language: "de-DE",
        utm: { source: "newsletter", medium: "email" },
      }),
    );
    expect(sessionStart.status).toBe(200);
    expect((await sessionStart.json()).success).toBe(true);

    const pageview = await POST(
      trackRequest({
        domain: LEGACY_DOMAIN,
        url: `https://${LEGACY_DOMAIN}/features`,
        path: "/features",
        event: "pageview",
        visitor_id: "legacy-visitor-1",
        session_id: "legacy-session-1",
        user_agent: CHROME_UA,
      }),
    );
    expect(pageview.status).toBe(200);

    // Old tables still written exactly as before.
    const { data: visits } = await db
      .from("visits")
      .select("*")
      .eq("website_id", LEGACY_DOMAIN);
    expect(visits).toHaveLength(1);
    expect(visits![0].utm_medium).toBe("email");

    const { data: pvs } = await db
      .from("page_views")
      .select("*")
      .eq("domain", LEGACY_DOMAIN);
    expect(pvs).toHaveLength(1);

    const { data: stats } = await db
      .from("daily_stats")
      .select("*")
      .eq("domain", LEGACY_DOMAIN);
    expect(stats).toHaveLength(1);
    expect(stats![0].visits).toBe(1);
    expect(stats![0].page_views).toBe(1);

    // Dual-write: the pageview also landed in the new pipeline, keyed by the
    // legacy localStorage visitor id.
    const { data: newEvents } = await db
      .from("events")
      .select("*")
      .eq("site_id", legacySiteId);
    expect(newEvents).toHaveLength(1);
    expect(newEvents![0].visitor_id).toBe("legacy-visitor-1");
    expect(newEvents![0].path).toBe("/features");

    const { data: newSessions } = await db
      .from("sessions")
      .select("*")
      .eq("site_id", legacySiteId);
    expect(newSessions).toHaveLength(1);
  });

  it("legacy custom-event API writes events_legacy and dual-writes sessionless", async () => {
    const { POST } = await import("@/app/api/events/route");
    const res = await POST(
      new NextRequest("http://localhost:3000/api/events", {
        method: "POST",
        body: JSON.stringify({
          name: "Purchase",
          domain: LEGACY_DOMAIN,
          description: "42 EUR",
        }),
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
      }),
    );
    expect(res.status).toBe(200);

    const { data: legacyRows } = await db
      .from("events_legacy")
      .select("*")
      .eq("website_id", LEGACY_DOMAIN);
    expect(legacyRows).toHaveLength(1);
    expect(legacyRows![0].event_name).toBe("purchase");

    const { data: v2Rows } = await db
      .from("events")
      .select("*")
      .eq("site_id", legacySiteId)
      .eq("name", "purchase");
    expect(v2Rows).toHaveLength(1);
    expect(v2Rows![0].session_id).toBeNull(); // sessionize=false

    const { data: apiSessions } = await db
      .from("sessions")
      .select("id")
      .eq("site_id", legacySiteId)
      .like("visitor_id", "api:%");
    expect(apiSessions).toHaveLength(0);
  });

  it("rejects unauthorized custom-event API calls", async () => {
    const { POST } = await import("@/app/api/events/route");
    const res = await POST(
      new NextRequest("http://localhost:3000/api/events", {
        method: "POST",
        body: JSON.stringify({ name: "x", domain: LEGACY_DOMAIN }),
        headers: {
          "content-type": "application/json",
          authorization: "Bearer wrong-key",
        },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("serves overview/timeseries/breakdown through lib/analytics/queries.ts", async () => {
    const { getOverview, getTimeseries, getBreakdown } = await import(
      "@/lib/analytics/queries"
    );
    const range = {
      from: new Date(Date.now() - 60 * 60 * 1000),
      to: new Date(Date.now() + 60 * 60 * 1000),
    };

    const overview = await getOverview(v2SiteId, range, db);
    expect(overview.pageviews).toBe(3); // /pricing, /docs, /
    expect(overview.visitors).toBe(2);
    expect(overview.sessions).toBe(2);
    expect(overview.bounceRate).toBeCloseTo(0.5, 5);

    const series = await getTimeseries(v2SiteId, range, "hour", db);
    expect(series.length).toBeGreaterThan(0);
    expect(series.reduce((acc, p) => acc + p.pageviews, 0)).toBe(3);

    const byPath = await getBreakdown(v2SiteId, range, "path", 10, db);
    expect(byPath.map((r) => r.value)).toEqual(
      expect.arrayContaining(["/pricing", "/docs", "/"]),
    );

    const byChannel = await getBreakdown(v2SiteId, range, "channel", 10, db);
    expect(byChannel.find((r) => r.value === "Email")).toBeTruthy();
  });

  it("rejects invalid breakdown dimensions at the database layer", async () => {
    const { getBreakdown } = await import("@/lib/analytics/queries");
    await expect(
      getBreakdown(
        v2SiteId,
        { from: new Date(0), to: new Date() },
        "visitor_id; drop table events" as never,
        10,
        db,
      ),
    ).rejects.toThrow(/invalid breakdown dimension/);
  });

  it("rollup_daily matches a full rebuild (incremental parity)", async () => {
    const { data: before } = await db
      .from("rollup_daily")
      .select("*")
      .eq("site_id", v2SiteId)
      .order("date");

    const { error } = await db.rpc("rebuild_rollup_daily", { p_site: v2SiteId });
    expect(error).toBeNull();

    const { data: after } = await db
      .from("rollup_daily")
      .select("*")
      .eq("site_id", v2SiteId)
      .order("date");
    expect(after).toEqual(before);
  });
});
