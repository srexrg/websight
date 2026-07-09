/**
 * Verify custom-events aggregation (plan 14): analytics_event_names counts vs
 * ground truth, prop-key listing, prop-value breakdown, and the dictionary
 * auto-upsert trigger (insert a fresh event -> dictionary row appears).
 * Requires migration 20260707040000. Run: npx tsx scripts/verify-events.mts
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
const RESERVED = new Set(["pageview", "web_vital", "error", "identify"]);
const from = new Date(Date.now() - 60 * 86_400_000).toISOString();
const to = new Date(Date.now() + 86_400_000).toISOString();

async function main() {
  const { data: site } = await sb.from("sites").select("id").eq("name", "Seed Demo").maybeSingle();
  if (!site) throw new Error("Seed Demo not found");

  // Ground truth: custom-event counts/visitors from raw events.
  const byName = new Map<string, { count: number; visitors: Set<string> }>();
  for (let f = 0; ; f += 1000) {
    const { data, error } = await sb
      .from("events").select("name, visitor_id")
      .eq("site_id", site.id).gte("created_at", from).lt("created_at", to).range(f, f + 999);
    if (error) throw new Error(error.message);
    for (const r of data!) {
      if (RESERVED.has(r.name as string)) continue;
      let g = byName.get(r.name as string);
      if (!g) { g = { count: 0, visitors: new Set() }; byName.set(r.name as string, g); }
      g.count++; g.visitors.add(r.visitor_id as string);
    }
    if (!data || data.length < 1000) break;
  }

  const { data: names, error: nErr } = await sb.rpc("analytics_event_names", { p_site: site.id, p_from: from, p_to: to, p_filters: [] });
  if (nErr) throw new Error(`names RPC: ${nErr.message}`);

  let fails = 0;
  console.log("event                 count(rpc/gt)   visitors(rpc/gt)");
  for (const r of names as { name: string; count: number; visitors: number }[]) {
    const gt = byName.get(r.name);
    const ok = gt && Number(r.count) === gt.count && Number(r.visitors) === gt.visitors.size;
    if (!ok) fails++;
    console.log(`  ${r.name.padEnd(20)} ${r.count}/${gt?.count}          ${r.visitors}/${gt?.visitors.size}${ok ? "" : " ✗"}`);
  }
  if (names!.length !== byName.size) { console.log(`✗ name count ${names!.length} != ${byName.size}`); fails++; }

  // Prop keys + values for a known event.
  const target = (names as { name: string }[]).find((n) => n.name === "add_to_cart")?.name ?? (names as { name: string }[])[0]?.name;
  if (target) {
    const { data: keys } = await sb.rpc("analytics_event_prop_keys", { p_site: site.id, p_name: target, p_from: from, p_to: to });
    console.log(`\nprop keys for "${target}": ${(keys as { key: string }[]).map((k) => k.key).join(", ") || "(none)"}`);
    const firstKey = (keys as { key: string }[])[0]?.key;
    if (firstKey) {
      const { data: vals } = await sb.rpc("analytics_event_prop_values", { p_site: site.id, p_name: target, p_key: firstKey, p_from: from, p_to: to, p_filters: [] });
      console.log(`  values of "${firstKey}": ${(vals as { value: string; count: number }[]).map((v) => `${v.value}=${v.count}`).join(", ")}`);
      // Ground-truth the top value count.
      const { data: raw } = await sb.from("events").select("props").eq("site_id", site.id).eq("name", target).gte("created_at", from).lt("created_at", to).limit(1000);
      const gtVals = new Map<string, number>();
      for (const r of raw!) { const v = (r.props as Record<string, unknown>)?.[firstKey]; if (v != null) gtVals.set(String(v), (gtVals.get(String(v)) ?? 0) + 1); }
      for (const v of vals as { value: string; count: number }[]) {
        if (gtVals.get(v.value) !== v.count) { console.log(`  ✗ value ${v.value}: rpc ${v.count} vs gt ${gtVals.get(v.value)}`); fails++; }
      }
    }
  }

  // Dictionary trigger: insert a fresh event, expect a dictionary row.
  const testName = `verify_ping_${Math.floor(Math.random() * 1e6).toString(36)}`;
  await sb.rpc("ensure_events_partition", { p_month: new Date().toISOString().slice(0, 7) + "-01" });
  const { error: insErr } = await sb.from("events").insert({
    site_id: site.id, name: testName, visitor_id: "verify-v", props: { source: "verify", n: 1 }, created_at: new Date().toISOString(),
  });
  if (insErr) throw new Error(`insert: ${insErr.message}`);
  const { data: dict } = await sb.from("event_dictionary").select("name").eq("site_id", site.id).eq("name", testName).maybeSingle();
  const dictOk = !!dict;
  console.log(`\nDictionary auto-upsert on fresh insert: ${dictOk ? "✓" : "✗ no row"}`);
  if (!dictOk) fails++;
  await sb.from("events").delete().eq("site_id", site.id).eq("name", testName);
  await sb.from("event_dictionary").delete().eq("site_id", site.id).eq("name", testName);

  console.log(fails === 0 ? "\n✅ PASS" : `\n❌ FAIL (${fails})`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
