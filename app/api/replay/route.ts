import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/utils/cors";
import { createAdminClient } from "@/utils/supabase/admin";
import { isBot } from "@/lib/analytics/bot";
import { clientIp, geoFromHeaders, parseDevice } from "@/lib/analytics/enrich";
import { getDailySalt, resolveVisitorId } from "@/lib/analytics/identity";
import { resolveSite } from "@/lib/analytics/sites";
import { openSessionId, parseChunkQuery } from "@/lib/replay/ingest";
import {
  putReplayObject,
  replayObjectPath,
  replayStorageConfigured,
} from "@/lib/replay/storage";
import { replaySettingsFrom } from "@/lib/replay/types";

/**
 * /api/replay - session-replay ingest (docs/redesign/24 milestone 1).
 *
 * GET  serves the per-site recorder config the tracker uses to decide
 * whether/how much to record.
 * POST stores one rrweb chunk in the object store and registers it in
 * Postgres (replay_recordings/replay_chunks), linking it to the visitor's
 * open session (plan-02 sessions) when one exists.
 *
 * Same posture as /api/track: CORS stays permissive (beacons are
 * cross-origin), and everything past basic request validation answers 202 -
 * a replay hiccup must never surface to the page. The only 4xx responses are
 * a malformed query (400) and an oversized body (413).
 */

const MAX_CHUNK_BYTES = 5 * 1024 * 1024;
const MAX_RECORDING_BYTES = 10 * 1024 * 1024;
const MAX_RECORDING_CHUNKS = 500;
const DAILY_SCAN_LIMIT = 5000;

const debug = (...args: unknown[]) => {
  if (process.env.DEBUG_TRACKING === "1") console.log("[replay]", ...args);
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// ----------------------------------------------------------------------- GET --

export async function GET(req: NextRequest) {
  const off = { on: false, sample: 0, maskText: false };
  const headers = { ...corsHeaders, "cache-control": "public, max-age=60, s-maxage=60" };

  const siteKey = new URL(req.url).searchParams.get("site");
  if (!siteKey) {
    return NextResponse.json(off, { headers });
  }

  const admin = createAdminClient();
  const site = await resolveSite(admin, siteKey);
  if (!site) {
    return NextResponse.json(off, { headers });
  }

  const s = replaySettingsFrom(site.settings);
  return NextResponse.json(
    { on: s.enabled && replayStorageConfigured(), sample: s.sampleRate, maskText: s.maskText },
    { headers },
  );
}

// ---------------------------------------------------------------------- POST --

type RecordingRow = {
  id: string;
  site_id: string;
  status: string;
  bytes: number | string;
  chunk_count: number;
  page_count: number;
  session_id: string | null;
};

const RECORDING_SELECT = "id, site_id, status, bytes, chunk_count, page_count, session_id";

export async function POST(req: NextRequest) {
  try {
    const meta = parseChunkQuery(new URL(req.url));
    if (!meta) {
      return NextResponse.json(
        { error: "Bad request" },
        { status: 400, headers: corsHeaders },
      );
    }

    const dropped = (reason: string) =>
      NextResponse.json({ ok: true, dropped: reason }, { status: 202, headers: corsHeaders });

    const userAgent = req.headers.get("user-agent");
    if (isBot(userAgent)) {
      return dropped("bot");
    }

    const body = await req.arrayBuffer();
    if (body.byteLength === 0) {
      return dropped("empty");
    }
    if (body.byteLength > MAX_CHUNK_BYTES) {
      return NextResponse.json(
        { error: "Payload too large" },
        { status: 413, headers: corsHeaders },
      );
    }

    const admin = createAdminClient();
    const site = await resolveSite(admin, meta.site);
    if (!site) {
      return dropped("unregistered");
    }

    const settings = replaySettingsFrom(site.settings);
    if (!settings.enabled || !replayStorageConfigured()) {
      return dropped("disabled");
    }

    let rec: RecordingRow | null = null;
    {
      const { data } = await admin
        .from("replay_recordings")
        .select(RECORDING_SELECT)
        .eq("id", meta.rid)
        .maybeSingle();
      rec = (data as RecordingRow | null) ?? null;
    }

    if (rec) {
      if (rec.site_id !== site.id) {
        return dropped("mismatch");
      }
      if (rec.status !== "active") {
        return dropped("closed");
      }
      if (
        Number(rec.bytes) + body.byteLength > MAX_RECORDING_BYTES ||
        rec.chunk_count >= MAX_RECORDING_CHUNKS
      ) {
        await admin
          .from("replay_recordings")
          .update({ status: "complete" })
          .eq("id", meta.rid)
          .eq("status", "active");
        return dropped("capped");
      }
    } else {
      // First arriving chunk for this recording id (not necessarily seq 0).
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recent } = await admin
        .from("replay_recordings")
        .select("bytes")
        .eq("site_id", site.id)
        .gte("started_at", since)
        .limit(DAILY_SCAN_LIMIT);
      const usedBytes = (recent ?? []).reduce(
        (sum: number, r: { bytes: number | string }) => sum + Number(r.bytes),
        0,
      );
      if (usedBytes + body.byteLength > settings.dailyCapMb * 1024 * 1024) {
        return dropped("quota");
      }

      const visitorId = resolveVisitorId({
        privacyMode: site.privacy_mode,
        vid: meta.vid,
        salt: await getDailySalt(admin),
        siteId: site.id,
        ip: clientIp(req.headers),
        userAgent: userAgent ?? "",
      });
      const sessionId = await openSessionId(admin, site.id, visitorId);
      const device = parseDevice(userAgent);
      const geo = geoFromHeaders(req.headers);
      const entryPath = pathnameFromReferer(req.headers.get("referer"));

      const { error: insertError } = await admin.from("replay_recordings").insert({
        id: meta.rid,
        site_id: site.id,
        session_id: sessionId,
        visitor_id: visitorId,
        entry_path: entryPath,
        device_type: device.device_type,
        browser: device.browser,
        os: device.os,
        country: geo.country,
        page_count: meta.pc,
        expires_at: new Date(Date.now() + settings.retentionDays * 86400000).toISOString(),
      });

      if (insertError) {
        if (insertError.code === "23505") {
          // Concurrent chunk for the same recording won the race - re-select
          // and continue as if it had existed all along.
          const { data } = await admin
            .from("replay_recordings")
            .select(RECORDING_SELECT)
            .eq("id", meta.rid)
            .maybeSingle();
          rec = (data as RecordingRow | null) ?? null;
        } else {
          console.error("[replay] recording insert failed:", insertError);
          return NextResponse.json({ ok: false }, { status: 202, headers: corsHeaders });
        }
      }
    }

    // Late session linkage: a recording created before the visitor's session
    // was open (or observed mid-race above) gets stitched up once one exists.
    if (rec && rec.session_id === null) {
      const visitorId = resolveVisitorId({
        privacyMode: site.privacy_mode,
        vid: meta.vid,
        salt: await getDailySalt(admin),
        siteId: site.id,
        ip: clientIp(req.headers),
        userAgent: userAgent ?? "",
      });
      const sid = await openSessionId(admin, site.id, visitorId);
      if (sid) {
        await admin
          .from("replay_recordings")
          .update({ session_id: sid })
          .eq("id", meta.rid)
          .is("session_id", null);
      }
    }

    const path = replayObjectPath(site.id, meta.rid, meta.seq, meta.gz);
    try {
      await putReplayObject(path, body);
    } catch (err) {
      console.error("[replay] put failed:", err);
      return NextResponse.json({ ok: false }, { status: 202, headers: corsHeaders });
    }

    const { error: chunkError } = await admin.from("replay_chunks").insert({
      recording_id: meta.rid,
      seq: meta.seq,
      storage_path: path,
      bytes: body.byteLength,
      gz: meta.gz,
    });
    if (chunkError) {
      if (chunkError.code === "23505") {
        // Duplicate retry of a chunk already stored - ack without recounting.
        return NextResponse.json({ ok: true }, { status: 202, headers: corsHeaders });
      }
      console.error("[replay] chunk insert failed:", chunkError);
      return NextResponse.json({ ok: false }, { status: 202, headers: corsHeaders });
    }

    const prevBytes = rec ? Number(rec.bytes) : 0;
    const prevChunkCount = rec ? rec.chunk_count : 0;
    const prevPageCount = rec ? rec.page_count : meta.pc;

    // RMW, not atomic: chunks for one recording arrive from one tab in order,
    // and both client and server enforce the caps, so a lost update is a
    // tolerable undercount.
    const { error: updateError } = await admin
      .from("replay_recordings")
      .update({
        last_activity_at: new Date().toISOString(),
        chunk_count: prevChunkCount + 1,
        bytes: prevBytes + body.byteLength,
        page_count: Math.max(prevPageCount, meta.pc),
      })
      .eq("id", meta.rid);
    if (updateError) {
      debug("counter update failed", updateError.message);
    }

    return NextResponse.json({ ok: true }, { status: 202, headers: corsHeaders });
  } catch (error) {
    console.error("[replay] unexpected error:", error);
    return NextResponse.json({ ok: false }, { status: 202, headers: corsHeaders });
  }
}

/** Referer's pathname, or null when absent/unparseable. */
function pathnameFromReferer(referer: string | null): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).pathname;
  } catch {
    return null;
  }
}
