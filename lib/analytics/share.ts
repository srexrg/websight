import { NextRequest } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

/**
 * Share-token access (docs/redesign/15). resolveSiteAccess is the single auth
 * gate for the analytics API: a signed-in owner gets `member` scope; a valid
 * share token gets `share` scope restricted to its exposed screens. Public
 * routes reuse the exact same fetchers, so there is never a forked query path.
 */

export type ShareRow = {
  id: string;
  site_id: string;
  token: string;
  visibility: "secret" | "public";
  password_hash: string | null;
  exposed_screens: string[];
  hide_events: boolean;
  created_at: string;
  rotated_at: string | null;
  last_accessed_at: string | null;
};

export type SiteAccess =
  | { ok: true; scope: "member"; siteId: string; timezone: string }
  | {
      ok: true;
      scope: "share";
      siteId: string;
      timezone: string;
      exposedScreens: string[];
      hideEvents: boolean;
    }
  | { ok: false; status: 401 | 403 | 404; reason: "unauthorized" | "locked" | "not_found" };

/** 24-char URL-safe token. */
export function generateShareToken(): string {
  return randomBytes(18).toString("base64url"); // 18 bytes -> 24 chars
}

export function shareCookieName(token: string): string {
  return `ws_share_${token}`;
}

/** Unforgeable unlock cookie: derived from the bcrypt hash (never exposed) + token. */
export function shareCookieValue(passwordHash: string, token: string): string {
  return createHash("sha256").update(`${passwordHash}:${token}`).digest("hex");
}

/**
 * Resolve site access for an analytics request. Prefers member (session) access;
 * falls back to a `?share=<token>` param. Reads/writes go through the admin
 * client for share scope since the visitor has no session/RLS identity.
 */
export async function resolveSiteAccess(publicId: string, req: NextRequest): Promise<SiteAccess> {
  // Member scope: RLS restricts the lookup to the owner's sites.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: site } = await supabase
      .from("sites")
      .select("id, timezone")
      .eq("public_id", publicId)
      .maybeSingle();
    if (site) return { ok: true, scope: "member", siteId: site.id as string, timezone: (site as { timezone: string }).timezone };
  }

  // Share scope.
  const token = req.nextUrl.searchParams.get("share");
  if (!token) return { ok: false, status: 401, reason: "unauthorized" };

  const admin = createAdminClient();
  const { data: share } = await admin
    .from("share_tokens")
    .select("*")
    .eq("token", token)
    .maybeSingle<ShareRow>();
  if (!share) return { ok: false, status: 404, reason: "not_found" };

  const { data: site } = await admin
    .from("sites")
    .select("id, public_id, timezone")
    .eq("id", share.site_id)
    .maybeSingle<{ id: string; public_id: string; timezone: string }>();
  if (!site || site.public_id !== publicId) return { ok: false, status: 404, reason: "not_found" };

  // Password gate: a valid unlock cookie must be present.
  if (share.password_hash) {
    const cookie = req.cookies.get(shareCookieName(token))?.value;
    if (cookie !== shareCookieValue(share.password_hash, token)) {
      return { ok: false, status: 403, reason: "locked" };
    }
  }

  return {
    ok: true,
    scope: "share",
    siteId: site.id,
    timezone: site.timezone,
    exposedScreens: Array.isArray(share.exposed_screens) ? share.exposed_screens : ["overview"],
    hideEvents: share.hide_events,
  };
}

/** Which analytics `kind`s a share scope may run, given its exposed screens. */
export function shareAllows(kind: string, exposedScreens: string[], hideEvents: boolean): boolean {
  const exposed = new Set(exposedScreens);
  // Non-sensitive traffic reads that power Overview / Pages / Sources / Audience.
  const CORE = new Set(["overview", "timeseries", "breakdown", "dimension-values"]);
  if (CORE.has(kind)) return true;
  // Per-session live data is sensitive (paths/device/city) - owner-only, even
  // though it powers the globe. Public globes keep the aggregate live counts.
  if (kind === "live-sessions") return false;
  // Realtime family requires an exposed realtime or globe screen.
  if (kind.startsWith("live-")) return exposed.has("realtime") || exposed.has("globe");
  // Custom events / goals are business-sensitive: only if not hidden AND exposed.
  if (kind === "events") return !hideEvents && exposed.has("events");
  if (kind.startsWith("goal")) return !hideEvents && exposed.has("goals");
  // Session replay (docs/redesign/24) is always-blocked, same as sessions: it
  // exposes raw DOM/input capture, never a public-dashboard concern. Listed
  // explicitly (not just caught by the default below) because that privacy
  // posture must never be relaxed by a future CORE/exposed-screen change.
  if (kind === "replays" || kind === "replay-detail" || kind === "session-replay") return false;
  // Everything else (sessions, profiles, funnels, journeys, retention, vitals,
  // errors, event-*, ...) is never exposed publicly.
  return false;
}
