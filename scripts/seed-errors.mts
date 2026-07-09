/**
 * Seed synthetic JS error events on the "Seed Demo" site for testing plan 13.
 * Inserts directly into events so the BEFORE-insert fingerprint trigger runs
 * exactly as in production. Idempotent: clears prior error rows + groups first.
 * One template's message varies only by a number, to prove fingerprint
 * normalization collapses it into a single group. Run: npx tsx scripts/seed-errors.mts
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
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(0xe770);
const DAY = 86_400_000;
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];

const paths = ["/", "/pricing", "/docs", "/checkout", "/signup"];
const devices: [string, string, string][] = [
  ["desktop", "Chrome", "Windows"], ["mobile", "Safari", "iOS"],
  ["desktop", "Firefox", "macOS"], ["mobile", "Chrome", "Android"],
];
const countries = ["US", "IN", "DE", "GB", "BR"];

// Each template => one expected group. `varyNum` injects a changing number to
// prove number-normalization keeps it in ONE group.
const templates = [
  {
    type: "TypeError",
    message: () => "Cannot read properties of undefined (reading 'map')",
    stack: "TypeError: Cannot read properties of undefined (reading 'map')\n  at renderList (https://app.demo.io/assets/app.4f3a1b.js:120:14)\n  at App (https://app.demo.io/assets/app.4f3a1b.js:88:3)",
    external: false,
  },
  {
    type: "Error",
    message: (n: number) => `Request failed with status ${n}`, // number varies
    stack: "Error: Request failed\n  at fetchData (https://app.demo.io/assets/api.9c2e.js:44:9)",
    external: false,
    varyNum: [500, 404, 503, 502],
  },
  {
    type: "ReferenceError",
    message: () => "gtag is not defined",
    stack: "ReferenceError: gtag is not defined\n  at https://www.googletagmanager.com/gtag/js:2:9",
    external: true,
    filename: "https://www.googletagmanager.com/gtag/js",
  },
  {
    type: "RangeError",
    message: () => "Maximum call stack size exceeded",
    stack: "RangeError: Maximum call stack size exceeded\n  at recurse (https://app.demo.io/assets/tree.1a.js:12:5)",
    external: false,
  },
  {
    type: "UnhandledRejection",
    message: () => "Failed to fetch",
    stack: "TypeError: Failed to fetch\n  at loadUser (https://app.demo.io/assets/user.7b.js:30:11)",
    external: false,
    promise: true,
  },
];

async function main() {
  const { data: site } = await sb.from("sites").select("id").eq("name", "Seed Demo").maybeSingle();
  if (!site) throw new Error("Seed Demo not found - run scripts/seed-demo.mts first");

  await sb.from("events").delete().eq("site_id", site.id).eq("name", "error");
  await sb.from("error_groups").delete().eq("site_id", site.id);

  const now = Date.now();
  const months = new Set<string>();
  for (let d = 0; d <= 14; d++) months.add(new Date(now - d * DAY).toISOString().slice(0, 7) + "-01");
  for (const mth of months) await sb.rpc("ensure_events_partition", { p_month: mth });

  const rows: Record<string, unknown>[] = [];
  const N = 480;
  for (let i = 0; i < N; i++) {
    const t = templates[i % templates.length];
    const [device, browser, os] = pick(devices);
    const n = t.varyNum ? pick(t.varyNum) : 0;
    rows.push({
      site_id: site.id,
      name: "error",
      visitor_id: `err-v${Math.floor(rnd() * 60)}`,
      path: pick(paths),
      device_type: device, browser, os, country: pick(countries),
      created_at: new Date(now - Math.floor(rnd() * 14 * DAY) - 60_000).toISOString(),
      props: {
        message: t.message(n),
        type: t.type,
        stack: t.stack,
        filename: t.filename,
        external: t.external,
        promise: t.promise,
      },
    });
  }
  for (let i = 0; i < rows.length; i += 300) {
    const { error } = await sb.from("events").insert(rows.slice(i, i + 300));
    if (error) throw new Error(error.message);
  }
  console.log(`Inserted ${rows.length} error events across ${templates.length} templates.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
