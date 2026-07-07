/**
 * Verify analytics_vitals_summary against an independent JS computation from raw
 * web_vital events (plan 12). p75 uses percentile_cont's linear interpolation so
 * it matches Postgres exactly. Requires migration 20260707010000 + seeded data.
 * Run: npx tsx scripts/verify-vitals.mts
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

const THRESH: Record<string, [number, number]> = {
  LCP: [2500, 4000], CLS: [0.1, 0.25], INP: [200, 500], FCP: [1800, 3000], TTFB: [800, 1800],
};
const rate = (m: string, v: number) => (v <= THRESH[m][0] ? "good" : v <= THRESH[m][1] ? "ni" : "poor");

/** Linear-interpolation percentile matching Postgres percentile_cont. */
function pcont(vals: number[], q: number): number | null {
  if (vals.length === 0) return null;
  const s = vals.slice().sort((a, b) => a - b);
  const rank = q * (s.length - 1);
  const lo = Math.floor(rank);
  const frac = rank - lo;
  return lo + 1 < s.length ? s[lo] + frac * (s[lo + 1] - s[lo]) : s[lo];
}

async function main() {
  const { data: site } = await sb.from("sites").select("id").eq("name", "Seed Demo").maybeSingle();
  if (!site) throw new Error("Seed Demo not found");

  // Ground truth: pull all web_vital rows (paginate past the 1000-row cap).
  const all: { metric: string; value: number }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("events")
      .select("props")
      .eq("site_id", site.id)
      .eq("name", "web_vital")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const r of data!) {
      const p = r.props as { metric?: string; value?: number };
      if (p?.metric && typeof p.value === "number") all.push({ metric: p.metric, value: p.value });
    }
    if (!data || data.length < 1000) break;
  }

  const byMetric = new Map<string, number[]>();
  for (const r of all) {
    if (!byMetric.has(r.metric)) byMetric.set(r.metric, []);
    byMetric.get(r.metric)!.push(r.value);
  }

  // RPC over the same all-time window.
  const { data: rows, error } = await sb.rpc("analytics_vitals_summary", {
    p_site: site.id,
    p_from: new Date(Date.now() - 60 * 86_400_000).toISOString(),
    p_to: new Date(Date.now() + 86_400_000).toISOString(),
    p_filters: [],
  });
  if (error) throw new Error(`RPC failed: ${error.message}`);
  const rpc = new Map((rows as { metric: string; p75: number; sample: number; good: number; ni: number; poor: number; rating: string }[]).map((r) => [r.metric, r]));

  let fails = 0;
  console.log("metric  n     p75(rpc)  p75(gt)   rating  dist(g/n/p rpc vs gt)");
  for (const [metric, vals] of byMetric) {
    const gt = pcont(vals, 0.75)!;
    const r = rpc.get(metric);
    if (!r) { console.log(`${metric}: MISSING from RPC`); fails++; continue; }
    const p75ok = Math.abs(r.p75 - gt) < 0.001;
    const gtDist = { good: 0, ni: 0, poor: 0 };
    for (const v of vals) gtDist[rate(metric, v) as "good" | "ni" | "poor"]++;
    const distOk = r.good === gtDist.good && r.ni === gtDist.ni && r.poor === gtDist.poor;
    const nOk = r.sample === vals.length;
    const ratingOk = r.rating === rate(metric, gt);
    if (!(p75ok && distOk && nOk && ratingOk)) fails++;
    console.log(
      `${metric.padEnd(6)} ${String(vals.length).padEnd(5)} ${String(r.p75).padEnd(9)} ${gt.toFixed(3).padEnd(9)} ${r.rating}${ratingOk ? "" : "≠" + rate(metric, gt)}  ${r.good}/${r.ni}/${r.poor} vs ${gtDist.good}/${gtDist.ni}/${gtDist.poor}${distOk ? "" : " ✗"}${nOk ? "" : " N✗"}`,
    );
  }
  console.log(fails === 0 ? "\n✅ PASS" : `\n❌ FAIL (${fails})`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
