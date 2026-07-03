/**
 * Backfill: legacy visits/page_views/events_legacy -> events/sessions/rollup_daily.
 *
 * Best-effort session reconstruction from the stored legacy session_id
 * (docs/redesign/02). Old tables are left untouched (read-only retirement is
 * milestone 4).
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/backfill.ts [--site <domain>] [--force]
 *
 * Idempotency: a site with pre-existing historical events (created before
 * today) is skipped unless --force is passed.
 */

import { createHash } from "crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { classifyChannel } from "../lib/analytics/channels";
import type { Channel, IngestEventRow, Site } from "../lib/analytics/types";

const CHUNK = 500;

type LegacyPageView = {
  id: number;
  domain: string | null;
  page: string | null;
  visitor_id: string | null;
  session_id: string | null;
  device_type: string | null;
  os: string | null;
  country: string | null;
  created_at: string;
};

type LegacyVisit = {
  session_id: string | null;
  visitor_id: string | null;
  source: string | null;
  screen_width: number | null;
  screen_height: number | null;
  language: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  device_type: string | null;
  os: string | null;
  country: string | null;
  created_at: string;
};

function admin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Deterministic uuid-v4-shaped id from a legacy session key. */
function legacySessionUuid(siteId: string, key: string): string {
  const h = createHash("md5").update(`${siteId}:${key}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function legacyChannel(visit: LegacyVisit | undefined): {
  channel: Channel;
  referrer_domain: string | null;
} {
  if (!visit) return { channel: "Direct", referrer_domain: null };
  const source = visit.source && visit.source !== "direct" ? visit.source : null;
  const looksLikeDomain = source !== null && source.includes(".");
  const channel = classifyChannel({
    referrerDomain: looksLikeDomain ? source : null,
    utmSource: visit.utm_source,
    utmMedium: visit.utm_medium,
  });
  return { channel, referrer_domain: looksLikeDomain ? source : null };
}

async function fetchAll<T>(
  query: (from: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query(from);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < 1000) break;
  }
  return all;
}

async function insertChunked(
  db: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
) {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await db.from(table).insert(rows.slice(i, i + CHUNK));
    if (error) throw new Error(`${table} insert failed: ${error.message}`);
  }
}

async function backfillSite(db: SupabaseClient, site: Site, force: boolean) {
  const domain = site.domains[0];
  if (!domain) return;
  console.log(`\n=== ${site.name} (${domain}) ===`);

  if (!force) {
    const { count } = await db
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("site_id", site.id)
      .lt("created_at", new Date().toISOString().split("T")[0]);
    if ((count ?? 0) > 0) {
      console.log(`skipped: ${count} historical events already present (use --force)`);
      return;
    }
  }

  const pageViews = await fetchAll<LegacyPageView>((from) =>
    db
      .from("page_views")
      .select("*")
      .eq("domain", domain)
      .order("created_at", { ascending: true })
      .range(from, from + 999),
  );
  const visits = await fetchAll<LegacyVisit>((from) =>
    db
      .from("visits")
      .select("*")
      .eq("website_id", domain)
      .order("created_at", { ascending: true })
      .range(from, from + 999),
  );
  const legacyEvents = await fetchAll<{
    event_name: string;
    message: string | null;
    created_at: string;
  }>((from) =>
    db
      .from("events_legacy")
      .select("*")
      .eq("website_id", domain)
      .order("created_at", { ascending: true })
      .range(from, from + 999),
  );
  console.log(
    `legacy rows: ${pageViews.length} page_views, ${visits.length} visits, ${legacyEvents.length} custom events`,
  );

  const visitBySession = new Map<string, LegacyVisit>();
  for (const v of visits) {
    if (v.session_id && !visitBySession.has(v.session_id)) {
      visitBySession.set(v.session_id, v);
    }
  }

  // Ensure partitions exist for every month we touch.
  const months = new Set<string>();
  for (const rows of [pageViews, visits, legacyEvents] as { created_at: string }[][]) {
    for (const r of rows) months.add(r.created_at.slice(0, 7) + "-01");
  }
  for (const month of months) {
    const { error } = await db.rpc("ensure_events_partition", { p_month: month });
    if (error) throw new Error(`ensure_events_partition ${month}: ${error.message}`);
  }

  // Events from page_views.
  const eventRows: (IngestEventRow & { session_id: string | null })[] = [];
  for (const pv of pageViews) {
    const sessionKey =
      pv.session_id ?? `${pv.visitor_id ?? "anon"}:${pv.created_at.slice(0, 10)}`;
    const visit = pv.session_id ? visitBySession.get(pv.session_id) : undefined;
    const { channel, referrer_domain } = legacyChannel(visit);
    eventRows.push({
      site_id: site.id,
      name: "pageview",
      visitor_id: pv.visitor_id ?? "legacy",
      session_id: legacySessionUuid(site.id, sessionKey),
      path: pv.page ?? "/",
      channel,
      referrer_domain,
      utm_source: visit?.utm_source ?? null,
      utm_medium: visit?.utm_medium ?? null,
      utm_campaign: visit?.utm_campaign ?? null,
      device_type: pv.device_type ?? visit?.device_type ?? null,
      os: pv.os ?? visit?.os ?? null,
      country: pv.country && /^[A-Za-z]{2}$/.test(pv.country) && pv.country !== "XX"
        ? pv.country.toUpperCase()
        : null,
      lang: visit?.language ?? null,
      screen_w: visit?.screen_width ?? null,
      screen_h: visit?.screen_height ?? null,
      created_at: pv.created_at,
    });
  }

  // Custom events from events_legacy (no visitor/session identity kept).
  for (const ev of legacyEvents) {
    eventRows.push({
      site_id: site.id,
      name: ev.event_name,
      visitor_id: "api:legacy",
      session_id: null,
      path: "/",
      props: ev.message ? { message: ev.message } : null,
      created_at: ev.created_at,
    });
  }

  // Sessions reconstructed from grouped pageviews.
  type SessionAcc = {
    id: string;
    visitor_id: string;
    started_at: string;
    last_event_at: string;
    entry_path: string;
    exit_path: string;
    pageviews: number;
    visit?: LegacyVisit;
  };
  const sessions = new Map<string, SessionAcc>();
  for (const pv of pageViews) {
    const sessionKey =
      pv.session_id ?? `${pv.visitor_id ?? "anon"}:${pv.created_at.slice(0, 10)}`;
    const id = legacySessionUuid(site.id, sessionKey);
    const existing = sessions.get(id);
    if (!existing) {
      sessions.set(id, {
        id,
        visitor_id: pv.visitor_id ?? "legacy",
        started_at: pv.created_at,
        last_event_at: pv.created_at,
        entry_path: pv.page ?? "/",
        exit_path: pv.page ?? "/",
        pageviews: 1,
        visit: pv.session_id ? visitBySession.get(pv.session_id) : undefined,
      });
    } else {
      existing.last_event_at = pv.created_at;
      existing.exit_path = pv.page ?? existing.exit_path;
      existing.pageviews += 1;
    }
  }

  const sessionRows = [...sessions.values()].map((s) => {
    const { channel, referrer_domain } = legacyChannel(s.visit);
    return {
      id: s.id,
      site_id: site.id,
      visitor_id: s.visitor_id,
      started_at: s.started_at,
      last_event_at: s.last_event_at,
      entry_path: s.entry_path,
      exit_path: s.exit_path,
      pageviews: s.pageviews,
      events: s.pageviews,
      channel,
      referrer_domain,
      country:
        s.visit?.country && /^[A-Za-z]{2}$/.test(s.visit.country) && s.visit.country !== "XX"
          ? s.visit.country.toUpperCase()
          : null,
      device_type: s.visit?.device_type ?? null,
      os: s.visit?.os ?? null,
      utm_source: s.visit?.utm_source ?? null,
      utm_medium: s.visit?.utm_medium ?? null,
      utm_campaign: s.visit?.utm_campaign ?? null,
      is_open: false,
    };
  });

  await insertChunked(db, "events", eventRows);
  await insertChunked(db, "sessions", sessionRows);

  const { error: rollupError } = await db.rpc("rebuild_rollup_daily", { p_site: site.id });
  if (rollupError) throw new Error(`rebuild_rollup_daily: ${rollupError.message}`);

  console.log(
    `backfilled: ${eventRows.length} events, ${sessionRows.length} sessions, rollups rebuilt`,
  );
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const siteFilter = args.includes("--site")
    ? args[args.indexOf("--site") + 1]
    : null;

  const db = admin();
  const { data: sites, error } = await db
    .from("sites")
    .select("id, public_id, name, domains, privacy_mode, settings, timezone, user_id");
  if (error) throw new Error(`sites fetch failed: ${error.message}`);

  for (const site of (sites ?? []) as Site[]) {
    if (siteFilter && !site.domains.includes(siteFilter)) continue;
    await backfillSite(db, site, force);
  }
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
