import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/utils/cors";
import { createAdminClient } from "@/utils/supabase/admin";
import { isBot } from "@/lib/analytics/bot";
import { clientIp, geoFromHeaders, parseDevice } from "@/lib/analytics/enrich";
import { getDailySalt, resolveVisitorId } from "@/lib/analytics/identity";
import { buildEventRow, ingestEvents } from "@/lib/analytics/ingest";
import {
  isLegacyPayload,
  normalizeBatch,
  normalizePayload,
} from "@/lib/analytics/payload";
import { resolveSite } from "@/lib/analytics/sites";
import type { IngestEventRow, LegacyTrackPayload } from "@/lib/analytics/types";

/**
 * POST /api/track - analytics ingestion (docs/redesign/02).
 *
 * Accepts:
 *   - v2 payloads (docs/redesign/01), single object or array batch -> 202
 *   - legacy public/tracker.js payloads -> old tables (unchanged behavior)
 *     PLUS dual-write of pageviews into the new pipeline, so the new
 *     dashboard has history from day one.
 *
 * CORS stays permissive: beacons are cross-origin by nature. Events for
 * unregistered sites are dropped (202, not an error - never break a page).
 */

const MAX_BODY_BYTES = 128 * 1024;

const debug = (...args: unknown[]) => {
  if (process.env.DEBUG_TRACKING === "1") console.log("[track]", ...args);
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Payload too large" },
        { status: 413, headers: corsHeaders },
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON" },
        { status: 400, headers: corsHeaders },
      );
    }

    if (isLegacyPayload(body)) {
      return handleLegacy(req, body);
    }
    return handleV2(req, body);
  } catch (error) {
    console.error("[track] unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500, headers: corsHeaders },
    );
  }
}

// ---------------------------------------------------------------------- v2 --

async function handleV2(req: NextRequest, body: unknown) {
  const userAgent = req.headers.get("user-agent");
  if (isBot(userAgent)) {
    debug("dropped bot", userAgent);
    return NextResponse.json(
      { accepted: 0, dropped: "bot" },
      { status: 202, headers: corsHeaders },
    );
  }

  const payloads = normalizeBatch(body);
  if (payloads.length === 0) {
    return NextResponse.json(
      { error: "No valid events in payload" },
      { status: 400, headers: corsHeaders },
    );
  }

  const admin = createAdminClient();
  const geo = geoFromHeaders(req.headers);
  const device = parseDevice(userAgent);
  const ip = clientIp(req.headers);
  const salt = await getDailySalt(admin);

  const rows: IngestEventRow[] = [];
  for (const payload of payloads) {
    const site = await resolveSite(admin, payload.site);
    if (!site) {
      debug("dropped unregistered site", payload.site);
      continue;
    }
    const visitorId = resolveVisitorId({
      privacyMode: site.privacy_mode,
      vid: payload.vid,
      salt,
      siteId: site.id,
      ip,
      userAgent: userAgent ?? "",
    });
    rows.push(buildEventRow({ payload, site, visitorId, device, geo }));
  }

  const accepted = await ingestEvents(admin, rows);
  debug("v2 accepted", accepted, "of", payloads.length);
  return NextResponse.json(
    { accepted },
    { status: 202, headers: corsHeaders },
  );
}

// ------------------------------------------------------------------ legacy --

async function handleLegacy(req: NextRequest, payload: LegacyTrackPayload) {
  const {
    domain,
    url,
    path,
    event,
    utm,
    source,
    user_agent,
    visitor_id,
    session_id,
    screen,
    language,
  } = payload;

  if (!domain || !url) {
    return NextResponse.json(
      { error: "Missing required fields: domain and url are required" },
      { status: 400, headers: corsHeaders },
    );
  }
  if (!["session_start", "pageview"].includes(event)) {
    return NextResponse.json(
      { error: "Invalid event type" },
      { status: 400, headers: corsHeaders },
    );
  }
  if (!url.includes(domain)) {
    debug("legacy domain mismatch", { url, domain });
    return NextResponse.json(
      { error: "Domain mismatch error" },
      { headers: corsHeaders },
    );
  }

  const admin = createAdminClient();
  const device = parseDevice(user_agent);
  const geo = geoFromHeaders(req.headers);
  const country = geo.country ?? "XX";
  const sourceName = source || utm?.medium || utm?.source || "direct";
  const today = new Date().toISOString().split("T")[0];

  if (event === "session_start") {
    const { data: existingVisit, error: visitCheckError } = await admin
      .from("visits")
      .select("visitor_id")
      .eq("website_id", domain)
      .eq("visitor_id", visitor_id)
      .gte("created_at", today)
      .maybeSingle();
    if (visitCheckError) {
      return legacyDbError("VISIT_CHECK_ERROR", visitCheckError.message);
    }
    const isNewVisitor = !existingVisit;

    const { error: visitError } = await admin.from("visits").insert([
      {
        website_id: domain,
        source: sourceName,
        visitor_id,
        session_id,
        device_type: device.device_type,
        os: device.os ?? "Unknown",
        country,
        screen_width: screen?.width,
        screen_height: screen?.height,
        language,
        utm_source: utm?.source,
        utm_medium: utm?.medium,
        utm_campaign: utm?.campaign,
      },
    ]);
    if (visitError) {
      return legacyDbError("VISIT_INSERT_ERROR", visitError.message);
    }

    const statsError = await bumpDailyStats(admin, domain, today, {
      visits: 1,
      unique_visitors: isNewVisitor ? 1 : 0,
      page_views: 0,
    });
    if (statsError) return statsError;
  }

  if (event === "pageview") {
    const { error: pageViewError } = await admin.from("page_views").insert([
      {
        domain,
        page: path || url,
        visitor_id,
        session_id,
        device_type: device.device_type,
        os: device.os ?? "Unknown",
        country,
      },
    ]);
    if (pageViewError) {
      return legacyDbError("PAGEVIEW_INSERT_ERROR", pageViewError.message);
    }

    const statsError = await bumpDailyStats(admin, domain, today, {
      visits: 0,
      unique_visitors: 0,
      page_views: 1,
    });
    if (statsError) return statsError;

    // Dual-write into the new pipeline (best effort - the legacy response
    // must not change if the new tables hiccup).
    try {
      await dualWritePageview(admin, req, payload, sourceName);
    } catch (err) {
      console.error("[track] dual-write failed:", err);
    }
  }

  debug("legacy processed", event, domain);
  return NextResponse.json(
    { success: true, event },
    { headers: corsHeaders },
  );
}

async function dualWritePageview(
  admin: ReturnType<typeof createAdminClient>,
  req: NextRequest,
  payload: LegacyTrackPayload,
  sourceName: string,
) {
  const site = await resolveSite(admin, payload.domain);
  if (!site) {
    debug("dual-write skipped, unregistered domain", payload.domain);
    return;
  }
  if (isBot(payload.user_agent ?? req.headers.get("user-agent"))) {
    return;
  }

  const normalized = normalizePayload({
    site: payload.domain,
    name: "pageview",
    url: payload.url,
    lang: payload.language,
    w: payload.screen?.width,
    h: payload.screen?.height,
  });
  if (!normalized) return;
  // The legacy tracker sends the SPA-aware path separately from url.
  if (payload.path) normalized.path = payload.path;
  if (!normalized.utm.source) normalized.utm.source = payload.utm?.source ?? null;
  if (!normalized.utm.medium) normalized.utm.medium = payload.utm?.medium ?? null;
  if (!normalized.utm.campaign) normalized.utm.campaign = payload.utm?.campaign ?? null;

  // Legacy tracker keeps a localStorage visitor id; reuse it so dual-written
  // sessions stay coherent across the transition regardless of privacy mode.
  const visitorId =
    payload.visitor_id ??
    resolveVisitorId({
      privacyMode: "stateless",
      vid: null,
      salt: await getDailySalt(admin),
      siteId: site.id,
      ip: clientIp(req.headers),
      userAgent: payload.user_agent ?? req.headers.get("user-agent") ?? "",
    });

  const row = buildEventRow({
    payload: normalized,
    site,
    visitorId,
    device: parseDevice(payload.user_agent ?? req.headers.get("user-agent")),
    geo: geoFromHeaders(req.headers),
  });
  // Preserve the legacy "source" hint for later reprocessing when we have no
  // referrer or UTM signal of our own.
  if (sourceName && sourceName !== "direct" && !row.referrer_domain && !row.utm_source) {
    row.url_query = { ...(row.url_query ?? {}), source: sourceName };
  }
  await ingestEvents(admin, [row]);
}

async function bumpDailyStats(
  admin: ReturnType<typeof createAdminClient>,
  domain: string,
  today: string,
  delta: { visits: number; unique_visitors: number; page_views: number },
) {
  const { data: existing, error: fetchError } = await admin
    .from("daily_stats")
    .select()
    .eq("domain", domain)
    .eq("date", today)
    .maybeSingle();
  if (fetchError) {
    return legacyDbError("STATS_FETCH_ERROR", fetchError.message);
  }

  if (existing) {
    const { error } = await admin
      .from("daily_stats")
      .update({
        visits: existing.visits + delta.visits,
        unique_visitors: existing.unique_visitors + delta.unique_visitors,
        page_views: existing.page_views + delta.page_views,
      })
      .eq("domain", domain)
      .eq("date", today);
    if (error) return legacyDbError("STATS_UPDATE_ERROR", error.message);
  } else {
    const { error } = await admin.from("daily_stats").insert({
      domain,
      date: today,
      ...delta,
    });
    if (error) return legacyDbError("STATS_INSERT_ERROR", error.message);
  }
  return null;
}

function legacyDbError(code: string, message: string) {
  console.error(`[track] ${code}: ${message}`);
  return NextResponse.json(
    { error: "Database operation failed", code },
    { status: 500, headers: corsHeaders },
  );
}
