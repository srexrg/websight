/**
 * Seed synthetic web_vital events on the "Seed Demo" site for testing plan 12.
 * Idempotent: deletes prior web_vital rows first. Distributions vary by path and
 * device (mobile + /signup are deliberately slow) with attribution elements, so
 * the pages table, breakdowns, and attribution panel all show structure.
 * Run: npx tsx scripts/seed-vitals.mts
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

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(0xa11ce);
const DAY = 86_400_000;
const paths = ["/", "/pricing", "/docs", "/docs/quickstart", "/blog/launch", "/signup"];
const devices: [string, string, string][] = [
  ["desktop", "Chrome", "Windows"],
  ["desktop", "Safari", "macOS"],
  ["mobile", "Chrome", "Android"],
  ["mobile", "Safari", "iOS"],
];
const countries = ["US", "IN", "DE", "GB", "BR"];
const elements: Record<string, string[]> = {
  LCP: ["img.hero-shot", "h1.title", "img.banner"],
  CLS: ["div.ad-slot", "img.banner", "section.reviews"],
  INP: ["button#cta", "a.nav-link", "button.buy"],
};

function pick<T>(a: T[]): T {
  return a[Math.floor(rnd() * a.length)];
}
function noise(base: number, spread: number): number {
  return Math.max(0, base + (rnd() - 0.5) * 2 * spread);
}

type Vital = { metric: string; value: number; element?: string };

/** Realistic per-load vitals; slower on mobile and on /signup, /blog. */
function loadVitals(path: string, device: string): Vital[] {
  const slow = (device === "mobile" ? 1.6 : 1) * (path === "/signup" ? 1.8 : path.startsWith("/blog") ? 1.4 : 1);
  const lcp = Math.round(noise(1600 * slow, 700));
  const inp = Math.round(noise(140 * slow, 90));
  const cls = Math.round(noise(0.06 * slow, 0.05) * 1000) / 1000;
  const fcp = Math.round(noise(1100 * slow, 500));
  const ttfb = Math.round(noise(380 * slow, 220));
  return [
    { metric: "LCP", value: lcp, element: pick(elements.LCP) },
    { metric: "INP", value: inp, element: pick(elements.INP) },
    { metric: "CLS", value: cls, element: pick(elements.CLS) },
    { metric: "FCP", value: fcp },
    { metric: "TTFB", value: ttfb },
  ];
}

function rate(metric: string, v: number): string {
  const t: Record<string, [number, number]> = {
    LCP: [2500, 4000], CLS: [0.1, 0.25], INP: [200, 500], FCP: [1800, 3000], TTFB: [800, 1800],
  };
  const [g, p] = t[metric];
  return v <= g ? "good" : v <= p ? "ni" : "poor";
}

async function main() {
  const { data: site } = await sb.from("sites").select("id").eq("name", "Seed Demo").maybeSingle();
  if (!site) throw new Error("Seed Demo site not found - run scripts/seed-demo.mts first");

  await sb.from("events").delete().eq("site_id", site.id).eq("name", "web_vital");

  // Ensure monthly partitions exist for the window we write into.
  const now = Date.now();
  const months = new Set<string>();
  for (let d = 0; d <= 30; d++) months.add(new Date(now - d * DAY).toISOString().slice(0, 7) + "-01");
  for (const mth of months) await sb.rpc("ensure_events_partition", { p_month: mth });

  const rows: Record<string, unknown>[] = [];
  const LOADS = 900;
  for (let i = 0; i < LOADS; i++) {
    const path = pick(paths);
    const [device, browser, os] = pick(devices);
    const country = pick(countries);
    const vid = `vit-${Math.floor(rnd() * 1e7).toString(36)}`;
    const t = now - Math.floor(rnd() * 30 * DAY) - 60_000;
    // Safari lacks INP/LCP - omit those for iOS/macOS Safari to exercise coverage notes.
    const safari = browser === "Safari";
    for (const v of loadVitals(path, device)) {
      if (safari && (v.metric === "INP" || v.metric === "LCP")) continue;
      rows.push({
        site_id: site.id,
        name: "web_vital",
        visitor_id: vid,
        path,
        device_type: device,
        browser,
        os,
        country,
        channel: pick(["Direct", "Organic Search", "Referral"]),
        props: {
          metric: v.metric,
          value: v.value,
          rating: rate(v.metric, v.value),
          element: v.element,
          loadState: "complete",
        },
        created_at: new Date(t).toISOString(),
      });
    }
  }

  // Insert in chunks.
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await sb.from("events").insert(rows.slice(i, i + 500));
    if (error) throw new Error(error.message);
  }
  console.log(`Inserted ${rows.length} web_vital events across ${LOADS} loads.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
