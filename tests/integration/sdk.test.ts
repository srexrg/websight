/**
 * SDK end-to-end: the BUILT tracker (public/t.js) runs a realistic browsing
 * session in jsdom; every beacon it emits is replayed byte-for-byte through
 * the real /api/track route into the database. Self-skips without a stack.
 */
import { NextRequest } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { clearSiteCache } from "@/lib/analytics/sites";
import { localStack } from "../helpers/local-stack";
import { bootTracker, click, type Beacon } from "../helpers/tracker-dom";

const stack = localStack();

const CHROME_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const runId = Date.now().toString(36);
const DOMAIN = `sdk-${runId}.test`;

let db: SupabaseClient;
let siteId: string;

async function replay(beacons: Beacon[]): Promise<number> {
  const { POST } = await import("@/app/api/track/route");
  let accepted = 0;
  for (const b of beacons) {
    const res = await POST(
      new NextRequest("http://localhost:3000/api/track", {
        method: "POST",
        body: b.body,
        headers: {
          // sendBeacon sends text/plain - the route must not care
          "content-type": "text/plain;charset=UTF-8",
          "user-agent": CHROME_UA,
          "x-forwarded-for": "203.0.113.99",
          "x-vercel-ip-country": "NL",
        },
      }),
    );
    expect(res.status).toBe(202);
    accepted += (await res.json()).accepted ?? 0;
  }
  return accepted;
}

describe.skipIf(!stack)("tracker SDK -> ingest -> DB", () => {
  beforeAll(async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = stack!.url;
    process.env.SUPABASE_SECRET_KEY = stack!.serviceKey;
    process.env.SUPABASE_SERVICE_ROLE_KEY = stack!.serviceKey;
    db = createClient(stack!.url, stack!.serviceKey, { auth: { persistSession: false } });

    const { data, error } = await db
      .from("sites")
      .insert({ name: "sdk e2e", domains: [DOMAIN] })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    siteId = data.id;
  });

  afterAll(async () => {
    if (!siteId) return;
    await db.from("events").delete().eq("site_id", siteId);
    await db.from("sessions").delete().eq("site_id", siteId);
    await db.from("rollup_daily").delete().eq("site_id", siteId);
    await db.from("sites").delete().eq("id", siteId);
  });

  it("a full browsing session lands correctly in events/sessions/rollups", async () => {
    const page = bootTracker({
      url: `https://${DOMAIN}/landing?utm_source=news&utm_medium=email&token=SECRET`,
      attrs: { site: DOMAIN },
      html: `<a id="out" href="https://elsewhere.example.org/read">read</a>
             <button id="cta" data-ws-event="cta_click">cta</button>`,
    });

    // SPA navigation, custom event with props, auto-captured interactions.
    page.window.history.pushState({}, "", "/features");
    (page.window.websight as { track: (n: string, p?: object) => void }).track("signup", {
      plan: "pro",
    });
    click(page, page.document.getElementById("out")!);
    click(page, page.document.getElementById("cta")!);
    page.hide(); // navigation away -> flush

    const accepted = await replay(page.beacons);
    expect(accepted).toBe(5); // 2 pageviews + signup + outbound_click + cta_click

    const { data: events } = await db
      .from("events")
      .select("*")
      .eq("site_id", siteId)
      .order("created_at");
    expect(events).toHaveLength(5);

    const landing = events!.find((e) => e.name === "pageview" && e.path === "/landing")!;
    expect(landing.utm_source).toBe("news");
    expect(landing.channel).toBe("Email");
    expect(landing.url_query).toEqual({ utm_source: "news", utm_medium: "email" });
    expect(landing.country).toBe("NL");
    // the SECRET token never left the browser, let alone reached the DB
    expect(JSON.stringify(events)).not.toContain("SECRET");

    const signup = events!.find((e) => e.name === "signup")!;
    expect(signup.props).toEqual({ plan: "pro" });

    const outbound = events!.find((e) => e.name === "outbound_click")!;
    expect((outbound.props as { url: string }).url).toBe("https://elsewhere.example.org/read");

    // one visitor, one session, both pageviews in it, not a bounce
    const { data: sessions } = await db.from("sessions").select("*").eq("site_id", siteId);
    expect(sessions).toHaveLength(1);
    expect(sessions![0].pageviews).toBe(2);
    expect(sessions![0].events).toBe(5);
    expect(sessions![0].is_bounce).toBe(false);
    expect(sessions![0].entry_path).toBe("/landing");
    expect(sessions![0].exit_path).toBe("/features");

    const { data: rollup } = await db.from("rollup_daily").select("*").eq("site_id", siteId);
    expect(rollup).toHaveLength(1);
    expect(rollup![0].pageviews).toBe(2);
    expect(rollup![0].sessions).toBe(1);
  });

  it("persistent-mode vid + identify() flow through to user_id", async () => {
    await db.from("sites").update({ privacy_mode: "persistent" }).eq("id", siteId);
    clearSiteCache(); // the first test resolved this site as stateless
    try {
      const page = bootTracker({
        url: `https://${DOMAIN}/app`,
        attrs: { site: DOMAIN, mode: "persistent" },
      });
      const ws = page.window.websight as {
        track: (n: string, p?: object) => void;
        identify: (id: string) => void;
      };
      ws.identify("customer-7");
      ws.track("upgraded");
      page.hide();

      await replay(page.beacons);

      const { data: ev } = await db
        .from("events")
        .select("*")
        .eq("site_id", siteId)
        .eq("name", "upgraded")
        .single();
      expect(ev.user_id).toBe("customer-7");
      expect(ev.visitor_id).toBe(page.window.localStorage.getItem("websight_vid"));
    } finally {
      await db.from("sites").update({ privacy_mode: "stateless" }).eq("id", siteId);
    }
  });
});
