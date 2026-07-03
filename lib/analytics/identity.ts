import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Visitor identity (docs/redesign/02):
 *   - stateless (default): hash(daily_salt + site + ip + ua). The salt lives
 *     in the `salts` table, rotates daily via pg_cron, and yesterday's salt is
 *     destroyed - raw IP/UA are never stored (Plausible's model).
 *   - persistent: the client-provided `vid` wins.
 * Both produce the same visitor_id column.
 */

const SALT_TTL_MS = 5 * 60 * 1000;

let saltCache: { value: string; fetchedAt: number } | null = null;

export async function getDailySalt(admin: SupabaseClient): Promise<string> {
  const now = Date.now();
  if (saltCache && now - saltCache.fetchedAt < SALT_TTL_MS) {
    return saltCache.value;
  }
  const { data, error } = await admin.rpc("current_salt");
  if (error || typeof data !== "string" || data.length === 0) {
    throw new Error(`current_salt failed: ${error?.message ?? "empty"}`);
  }
  saltCache = { value: data, fetchedAt: now };
  return data;
}

/** Test hook. */
export function clearSaltCache(): void {
  saltCache = null;
}

export function visitorHash(
  salt: string,
  siteId: string,
  ip: string,
  userAgent: string,
): string {
  return createHash("sha256")
    .update(`${salt}:${siteId}:${ip}:${userAgent}`)
    .digest("hex")
    .slice(0, 32);
}

export function resolveVisitorId(args: {
  privacyMode: "stateless" | "persistent";
  vid: string | null;
  salt: string;
  siteId: string;
  ip: string;
  userAgent: string;
}): string {
  if (args.privacyMode === "persistent" && args.vid) {
    return args.vid;
  }
  return visitorHash(args.salt, args.siteId, args.ip, args.userAgent);
}
