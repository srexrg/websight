/**
 * Verify the analytics_retention RPC against an independent JS computation from
 * raw sessions (plan 11). Weekly, first-seen entry / any-visit return, tz=UTC.
 * Requires migration 20260707000000 pushed. Run: npx tsx scripts/verify-retention.mts
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

const PERIODS = 12;

/** Monday (UTC) of the ISO week containing ms, as 'YYYY-MM-DD' (== date_trunc('week')). */
function weekStart(ms: number): string {
  const d = new Date(ms);
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff))
    .toISOString()
    .slice(0, 10);
}
function weeksBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / (7 * 86_400_000));
}

async function main() {
  const { data: site } = await sb.from("sites").select("id, timezone").eq("name", "Seed Demo").maybeSingle();
  if (!site) throw new Error("Seed Demo site not found - run scripts/seed-demo.mts first");

  // --- ground truth from raw sessions ---
  const { data: sessions, error } = await sb
    .from("sessions")
    .select("visitor_id, user_id, started_at")
    .eq("site_id", site.id);
  if (error) throw new Error(error.message);

  const now = Date.now();
  const fromBucket = weekStart(now - PERIODS * 7 * 86_400_000);

  const firstOf = new Map<string, string>();
  const activeOf = new Map<string, Set<string>>();
  for (const s of sessions!) {
    const ident = (s.user_id && s.user_id !== "" ? s.user_id : s.visitor_id) as string;
    const b = weekStart(Date.parse(s.started_at));
    if (!firstOf.has(ident) || b < firstOf.get(ident)!) firstOf.set(ident, b);
    if (!activeOf.has(ident)) activeOf.set(ident, new Set());
    activeOf.get(ident)!.add(b);
  }

  // cohort -> size, and (cohort, period) -> returned identities
  const size = new Map<string, number>();
  const ret = new Map<string, number>(); // key `${cohort}|${period}`
  for (const [ident, cohort] of firstOf) {
    if (cohort < fromBucket) continue;
    size.set(cohort, (size.get(cohort) ?? 0) + 1);
    for (const b of activeOf.get(ident)!) {
      const p = weeksBetween(cohort, b);
      if (p >= 0) ret.set(`${cohort}|${p}`, (ret.get(`${cohort}|${p}`) ?? 0) + 1);
    }
  }

  // --- RPC ---
  const { data: rows, error: rErr } = await sb.rpc("analytics_retention", {
    p_site: site.id,
    p_from: new Date(now - PERIODS * 7 * 86_400_000).toISOString(),
    p_to: new Date(now).toISOString(),
    p_interval: "week",
    p_tz: "UTC",
    p_filters: [],
  });
  if (rErr) throw new Error(`RPC failed: ${rErr.message}`);

  const rpcRet = new Map<string, number>();
  const rpcSize = new Map<string, number>();
  for (const r of rows as { cohort: string; active: string; cnt: number; cohort_size: number }[]) {
    const p = weeksBetween(r.cohort, r.active);
    rpcRet.set(`${r.cohort}|${p}`, Number(r.cnt));
    rpcSize.set(r.cohort, Number(r.cohort_size));
  }

  // --- compare ---
  let mismatches = 0;
  const allCohorts = [...new Set([...size.keys(), ...rpcSize.keys()])].sort();
  console.log(`Cohorts (weekly, from ${fromBucket}):`);
  for (const c of allCohorts) {
    const gs = size.get(c) ?? 0;
    const rs = rpcSize.get(c) ?? 0;
    const sizeOk = gs === rs;
    if (!sizeOk) mismatches++;
    const maxP = weeksBetween(c, weekStart(now));
    const cells: string[] = [];
    for (let p = 0; p <= maxP; p++) {
      const g = ret.get(`${c}|${p}`) ?? 0;
      const r = rpcRet.get(`${c}|${p}`) ?? 0;
      if (g !== r) mismatches++;
      cells.push(`${p}:${r}${g === r ? "" : `(≠${g})`}`);
    }
    console.log(`  ${c}  size=${rs}${sizeOk ? "" : `(≠${gs})`}  ${cells.join(" ")}`);
  }

  // period-0 returned must equal cohort size (conservation invariant)
  let invariantFail = 0;
  for (const c of allCohorts) {
    if ((rpcRet.get(`${c}|0`) ?? 0) !== (rpcSize.get(c) ?? 0)) invariantFail++;
  }

  console.log(`\nRPC rows: ${(rows as unknown[]).length}`);
  console.log(`Ground-truth vs RPC mismatches: ${mismatches}`);
  console.log(`Period-0 == cohort-size invariant failures: ${invariantFail}`);
  console.log(mismatches === 0 && invariantFail === 0 ? "✅ PASS" : "❌ FAIL");
  process.exit(mismatches === 0 && invariantFail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
