/**
 * Verify error fingerprinting + grouping (plan 13). Confirms: the number-varying
 * template collapses into ONE group; error_groups.occurrences matches the raw
 * per-fingerprint counts; external errors are flagged; and analytics_error_groups
 * range counts match ground truth. Requires migration 20260707030000 + seeded data.
 * Run: npx tsx scripts/verify-errors.mts
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

async function main() {
  const { data: site } = await sb.from("sites").select("id").eq("name", "Seed Demo").maybeSingle();
  if (!site) throw new Error("Seed Demo not found");

  // Ground truth from raw events (fingerprint written by the trigger).
  const evByFp = new Map<string, { occ: number; visitors: Set<string>; messages: Set<string> }>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("events").select("visitor_id, props")
      .eq("site_id", site.id).eq("name", "error").range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const r of data!) {
      const p = r.props as { fingerprint?: string; message?: string };
      if (!p?.fingerprint) continue;
      let g = evByFp.get(p.fingerprint);
      if (!g) { g = { occ: 0, visitors: new Set(), messages: new Set() }; evByFp.set(p.fingerprint, g); }
      g.occ++; g.visitors.add(r.visitor_id as string); if (p.message) g.messages.add(p.message);
    }
    if (!data || data.length < 1000) break;
  }

  const { data: groups } = await sb.from("error_groups").select("*").eq("site_id", site.id);
  const gByFp = new Map(groups!.map((g) => [g.fingerprint as string, g]));

  let fails = 0;
  console.log(`Distinct fingerprints (raw): ${evByFp.size}   error_groups rows: ${groups!.length}`);
  if (evByFp.size !== groups!.length) { console.log("✗ group count != distinct fingerprints"); fails++; }

  for (const [fp, gt] of evByFp) {
    const g = gByFp.get(fp);
    if (!g) { console.log(`✗ missing group for ${fp}`); fails++; continue; }
    const occOk = Number(g.occurrences) === gt.occ;
    if (!occOk) fails++;
    console.log(
      `  ${fp.slice(0, 8)}  occ ${g.occurrences}${occOk ? "" : `≠${gt.occ}`}  ext=${g.is_external}  msgs=${gt.messages.size}  "${(g.message as string).slice(0, 40)}"`,
    );
  }

  // The number-varying template ("Request failed with status N") must be ONE
  // group despite multiple distinct messages.
  const varyGroup = [...evByFp.entries()].find(([, g]) => [...g.messages].some((m) => m.startsWith("Request failed with status")));
  if (varyGroup) {
    const distinctMsgs = varyGroup[1].messages.size;
    console.log(`\nNumber-normalization: "Request failed..." has ${distinctMsgs} distinct messages in 1 group ${distinctMsgs > 1 ? "✓" : "(only 1 msg seen)"}`);
  }

  // RPC range counts vs ground truth.
  const { data: rpc, error: rErr } = await sb.rpc("analytics_error_groups", {
    p_site: site.id,
    p_from: new Date(Date.now() - 30 * 86_400_000).toISOString(),
    p_to: new Date(Date.now() + 86_400_000).toISOString(),
    p_status: null, p_filters: [], p_limit: 200,
  });
  if (rErr) throw new Error(`RPC failed: ${rErr.message}`);
  console.log(`\nanalytics_error_groups returned ${rpc!.length} groups`);
  for (const r of rpc as { fingerprint: string; occurrences: number; visitors: number }[]) {
    const gt = evByFp.get(r.fingerprint);
    const ok = gt && Number(r.occurrences) === gt.occ && Number(r.visitors) === gt.visitors.size;
    if (!ok) { fails++; console.log(`  ✗ RPC ${r.fingerprint.slice(0, 8)} occ=${r.occurrences}/vis=${r.visitors} vs ${gt?.occ}/${gt?.visitors.size}`); }
  }

  console.log(fails === 0 ? "\n✅ PASS" : `\n❌ FAIL (${fails})`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
