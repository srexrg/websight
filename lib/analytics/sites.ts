import type { SupabaseClient } from "@supabase/supabase-js";
import type { Site } from "./types";

/**
 * Site registry lookups for ingestion. The tracker sends either the site's
 * public_id or (v2 default / legacy tracker) a domain. Results are cached
 * in-memory for 60s - ingestion must not add a registry query per beacon.
 */

const CACHE_TTL_MS = 60 * 1000;
const cache = new Map<string, { site: Site | null; at: number }>();

/** Normalize a site key: lowercase, strip protocol/www/port/path. */
export function normalizeSiteKey(raw: string): string | null {
  const key = raw.trim().toLowerCase();
  if (key === "") return null;
  const noProto = key.replace(/^[a-z][a-z0-9+.-]*:\/\//, "").replace(/^www\./, "");
  const host = noProto.split(/[/?#]/)[0]?.split(":")[0] ?? "";
  if (!/^[a-z0-9][a-z0-9.-]*$/.test(host)) return null;
  return host;
}

export async function resolveSite(
  admin: SupabaseClient,
  rawKey: string,
): Promise<Site | null> {
  const key = normalizeSiteKey(rawKey);
  if (!key) return null;

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.site;

  const { data, error } = await admin
    .from("sites")
    .select("id, public_id, name, domains, privacy_mode, settings, timezone, user_id")
    .or(`public_id.eq.${key},domains.cs.{${key}}`)
    .limit(1)
    .maybeSingle();

  const site = error ? null : ((data as Site | null) ?? null);
  cache.set(key, { site, at: Date.now() });
  return site;
}

/** Test hook. */
export function clearSiteCache(): void {
  cache.clear();
}
