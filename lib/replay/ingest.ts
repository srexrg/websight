import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Shared query parsing and session-linkage helpers for the /api/replay POST
 * ingest route (docs/redesign/24 milestone 1). Kept separate from the route
 * so both it and its tests can import small, pure(ish) pieces.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The 30-minute idle window that also gates session closure elsewhere. */
const SESSION_IDLE_MS = 30 * 60 * 1000;

export type ReplayChunkMeta = {
  site: string;
  rid: string;
  seq: number;
  pc: number;
  gz: boolean;
  vid: string | null;
};

/**
 * Parse+validate the POST query params. Null when invalid: missing site, rid
 * not a uuid, seq not an integer 0..500, pc not a positive integer (absent ->
 * 1), gz anything but "0"/"1" (absent -> "0").
 */
export function parseChunkQuery(url: URL): ReplayChunkMeta | null {
  const params = url.searchParams;

  const site = params.get("site");
  if (!site) return null;

  const rid = params.get("rid");
  if (!rid || !UUID_RE.test(rid)) return null;

  const seqRaw = params.get("seq");
  if (seqRaw === null || !/^-?\d+$/.test(seqRaw)) return null;
  const seq = Number(seqRaw);
  if (!Number.isInteger(seq) || seq < 0 || seq > 500) return null;

  const pcRaw = params.get("pc");
  let pc = 1;
  if (pcRaw !== null) {
    if (!/^\d+$/.test(pcRaw)) return null;
    pc = Number(pcRaw);
    if (!Number.isInteger(pc) || pc < 1) return null;
  }

  const gzRaw = params.get("gz");
  if (gzRaw !== null && gzRaw !== "0" && gzRaw !== "1") return null;
  const gz = gzRaw === "1";

  const vid = params.get("vid");

  return { site, rid, seq, pc, gz, vid };
}

/**
 * The visitor's open session, honoring the 30-minute idle window (a stale
 * open session the cron has not closed yet does not count). Null when none.
 */
export async function openSessionId(
  admin: SupabaseClient,
  siteId: string,
  visitorId: string,
): Promise<string | null> {
  const { data, error } = await admin
    .from("sessions")
    .select("id, last_event_at")
    .eq("site_id", siteId)
    .eq("visitor_id", visitorId)
    .eq("is_open", true)
    .maybeSingle();

  if (error || !data) return null;
  const lastEventAt = new Date(data.last_event_at as string).getTime();
  if (Number.isNaN(lastEventAt) || Date.now() - lastEventAt > SESSION_IDLE_MS) {
    return null;
  }
  return data.id as string;
}
