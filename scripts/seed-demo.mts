/**
 * Seed a throwaway "Seed Demo" site with synthetic sessions/events for testing
 * the plan-07 screens without touching real site data. Feeds events through the
 * real ingest_event RPC so sessions form exactly like production traffic.
 *
 * Run: npx tsx scripts/seed-demo.mts        (reseeds; purges prior seed data)
 * The site is owned by whoever owns public_id 9xdcx6fw (the logged-in account).
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false },
});

const SEED_NAME = "Seed Demo";
const SEED_DOMAIN = "seed-demo.local";

// Deterministic PRNG so reseeds are reproducible.
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Ev = Record<string, unknown> & { created_at: string };

function generate(siteId: string): Ev[] {
  const rnd = mulberry32(1337);
  const pick = <T>(a: T[]): T => a[Math.floor(rnd() * a.length)];
  const countries: [string, string | null][] = [
    ["US", "New York"], ["US", "San Francisco"], ["IN", "Mumbai"], ["IN", "Bengaluru"],
    ["DE", "Berlin"], ["GB", "London"], ["BR", "Sao Paulo"], ["JP", "Tokyo"],
    ["CA", "Toronto"], ["FR", "Paris"], ["AU", "Sydney"], ["NG", "Lagos"],
  ];
  const devices: [string, string, string][] = [
    ["desktop", "Chrome", "Windows"], ["desktop", "Firefox", "Linux"],
    ["desktop", "Safari", "macOS"], ["mobile", "Chrome", "Android"],
    ["mobile", "Safari", "iOS"], ["tablet", "Safari", "iOS"], ["desktop", "Edge", "Windows"],
  ];
  const refs: [string | null, string][] = [
    ["google.com", "Organic Search"], ["t.co", "Social"], ["github.com", "Referral"],
    [null, "Direct"], ["bing.com", "Organic Search"], ["linkedin.com", "Social"],
  ];
  const paths = ["/", "/pricing", "/blog", "/blog/getting-started", "/blog/scaling-analytics",
    "/docs", "/docs/quickstart", "/about", "/features", "/signup"];
  const customs: [string, Record<string, unknown>][] = [
    ["signup_click", { plan: "pro" }], ["add_to_cart", { sku: "SKU-42", value: 29 }],
    ["video_play", { id: "demo", pct: 75 }], ["newsletter_subscribe", {}],
    ["download", { file: "sdk.zip" }],
  ];
  const now = Date.now();
  const DAY = 86_400_000;
  const events: Ev[] = [];
  const NV = 45;

  for (let v = 0; v < NV; v++) {
    const vid = `seed-v${v.toString(36).padStart(3, "0")}-${Math.floor(rnd() * 1e6).toString(36)}`;
    const [country, city] = pick(countries);
    const [device, browser, os] = pick(devices);
    const [refDomain, channel] = pick(refs);
    const userId = rnd() < 0.25 ? `user_${v}@demo.io` : null;
    const traits = userId
      ? {
          name: `${pick(["Priya", "Alex", "Sam", "Mika", "Jordan", "Lee", "Noor", "Diego"])} ${pick(["A.", "B.", "K.", "R.", "S."])}`,
          plan: pick(["free", "pro", "enterprise"]),
          company: pick(["Acme", "Globex", "Initech", "Umbrella", "Hooli"]),
        }
      : null;
    const nSessions = 1 + Math.floor(rnd() * 3);
    let identified = false;

    for (let s = 0; s < nSessions; s++) {
      // A few visitors get a very recent session -> stays "active/LIVE".
      const start =
        v < 3 && s === nSessions - 1
          ? now - (1 + Math.floor(rnd() * 8)) * 60_000
          : now - Math.floor(rnd() * 30 * DAY) - 3 * 60_000;
      const nPv = rnd() < 0.35 ? 1 : 1 + Math.floor(rnd() * 6);
      let t = start;
      let path = pick(paths);
      // Emit one identify event (with traits) the first time we see this user.
      if (userId && traits && !identified) {
        identified = true;
        events.push({
          site_id: siteId, visitor_id: vid, name: "identify", path,
          created_at: new Date(t - 1000).toISOString(),
          user_id: userId, props: traits, country, city, device_type: device, browser, os, channel,
        });
      }
      for (let p = 0; p < nPv; p++) {
        path = p === 0 ? path : pick(paths);
        events.push({
          site_id: siteId, visitor_id: vid, name: "pageview", path,
          created_at: new Date(t).toISOString(),
          country, city, region: null, device_type: device, browser, os,
          referrer_domain: refDomain ?? undefined,
          referrer: p === 0 && refDomain ? `https://${refDomain}/` : undefined,
          channel, user_id: userId ?? undefined,
          title: path === "/" ? "Home" : path.replace(/\//g, " ").trim(),
          lang: "en-US", screen_w: 1920, screen_h: 1080,
        });
        t += (12 + Math.floor(rnd() * 220)) * 1000;
        if (rnd() < 0.3) {
          const [name, props] = pick(customs);
          events.push({
            site_id: siteId, visitor_id: vid, name, path,
            created_at: new Date(t).toISOString(),
            country, city, device_type: device, browser, os, channel,
            user_id: userId ?? undefined, props,
          });
          t += (5 + Math.floor(rnd() * 90)) * 1000;
        }
      }
    }
  }
  return events;
}

async function main() {
  const { data: owner, error: oErr } = await sb
    .from("sites").select("user_id").eq("public_id", "9xdcx6fw").single();
  if (oErr || !owner?.user_id) throw new Error("could not resolve owner: " + oErr?.message);
  const userId = owner.user_id as string;

  let { data: site } = await sb
    .from("sites").select("id, public_id").eq("name", SEED_NAME).eq("user_id", userId).maybeSingle();

  if (site) {
    await sb.from("events").delete().eq("site_id", site.id);
    await sb.from("sessions").delete().eq("site_id", site.id);
    console.log("reusing seed site", site.public_id, "(purged prior data)");
  } else {
    const { data: created, error } = await sb
      .from("sites")
      .insert({ name: SEED_NAME, domains: [SEED_DOMAIN], privacy_mode: "persistent", user_id: userId })
      .select("id, public_id").single();
    if (error) throw new Error("create site: " + error.message);
    site = created;
    console.log("created seed site", site.public_id);
  }

  const events = generate(site.id as string);
  events.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  for (let i = 0; i < events.length; i += 200) {
    const { error } = await sb.rpc("ingest_event", { p_events: events.slice(i, i + 200) });
    if (error) throw new Error(`ingest batch ${i}: ${error.message}`);
  }

  // Deterministically close sessions idle > 30 min (cron does this every 15 min anyway).
  await sb.from("sessions").update({ is_open: false })
    .eq("site_id", site.id).lt("last_event_at", new Date(Date.now() - 30 * 60_000).toISOString());

  const { count: sc } = await sb.from("sessions").select("id", { count: "exact", head: true }).eq("site_id", site.id);
  const { count: ec } = await sb.from("events").select("id", { count: "exact", head: true }).eq("site_id", site.id);
  const { count: oc } = await sb.from("sessions").select("id", { count: "exact", head: true }).eq("site_id", site.id).eq("is_open", true);
  console.log(`\nSeeded ${events.length} events -> ${sc} sessions (${ec} stored events, ${oc} active/LIVE).`);
  console.log(`Open in app:  /${site.public_id}/sessions`);
}

main().catch((e) => { console.error("SEED FAILED:", e.message); process.exit(1); });
