import type { LegacyTrackPayload, TrackPayload } from "./types";

/**
 * Payload validation/normalization for POST /api/track.
 *
 * Two shapes are accepted during the transition:
 *   - v2 (docs/redesign/01): { site, name, url, ... }, single or array
 *   - legacy (public/tracker.js): { domain, event, url, ... }, single only
 */

export const MAX_BATCH_SIZE = 50;
export const MAX_PROPS_BYTES = 4096;
const MAX_NAME_LEN = 120;
const MAX_URL_LEN = 2048;
const MAX_TEXT_LEN = 512;

/** Query params preserved server-side; everything else is stripped (privacy). */
const KEPT_QUERY_KEYS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "ref",
  "source",
]);

export function isLegacyPayload(body: unknown): body is LegacyTrackPayload {
  return (
    typeof body === "object" &&
    body !== null &&
    !Array.isArray(body) &&
    "domain" in body &&
    "event" in body
  );
}

export type NormalizedPayload = {
  site: string;
  name: string;
  path: string;
  /** Kept query params only. Null when none. */
  urlQuery: Record<string, string> | null;
  /** All query keys on the original URL (paid click-id detection). */
  queryKeys: string[];
  utm: {
    source: string | null;
    medium: string | null;
    campaign: string | null;
    term: string | null;
    content: string | null;
  };
  title: string | null;
  referrer: string | null;
  lang: string | null;
  screenW: number | null;
  screenH: number | null;
  vid: string | null;
  uid: string | null;
  props: Record<string, unknown> | null;
};

function cleanText(v: unknown, max = MAX_TEXT_LEN): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, max);
  return s === "" ? null : s;
}

function cleanInt(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 100000) return null;
  return Math.round(n);
}

/**
 * Parse the tracked URL into path + retained query params. Accepts absolute
 * URLs and bare paths.
 */
export function parseTrackedUrl(rawUrl: string): {
  path: string;
  urlQuery: Record<string, string> | null;
  queryKeys: string[];
} {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl, "http://x.invalid");
  } catch {
    return { path: "/", urlQuery: null, queryKeys: [] };
  }

  const kept: Record<string, string> = {};
  const keys: string[] = [];
  parsed.searchParams.forEach((value, key) => {
    const k = key.toLowerCase();
    keys.push(k);
    if (KEPT_QUERY_KEYS.has(k)) kept[k] = value.slice(0, MAX_TEXT_LEN);
  });

  const path = parsed.pathname === "" ? "/" : parsed.pathname.slice(0, MAX_URL_LEN);
  return {
    path,
    urlQuery: Object.keys(kept).length > 0 ? kept : null,
    queryKeys: keys,
  };
}

/**
 * Validate and normalize one v2 payload item. Returns null (drop) when the
 * item is malformed - a bad event in a batch never fails the batch.
 */
export function normalizePayload(item: unknown): NormalizedPayload | null {
  if (typeof item !== "object" || item === null || Array.isArray(item)) return null;
  const p = item as Partial<TrackPayload>;

  const site = cleanText(p.site, 253)?.toLowerCase() ?? null;
  const name = cleanText(p.name, MAX_NAME_LEN);
  const url = typeof p.url === "string" ? p.url.slice(0, MAX_URL_LEN) : null;
  if (!site || !name || !url) return null;

  let props: Record<string, unknown> | null = null;
  if (typeof p.props === "object" && p.props !== null && !Array.isArray(p.props)) {
    const serialized = JSON.stringify(p.props);
    if (serialized.length <= MAX_PROPS_BYTES) props = p.props as Record<string, unknown>;
  }

  const { path, urlQuery, queryKeys } = parseTrackedUrl(url);

  return {
    site,
    name,
    path,
    urlQuery,
    queryKeys,
    utm: {
      source: urlQuery?.utm_source ?? null,
      medium: urlQuery?.utm_medium ?? null,
      campaign: urlQuery?.utm_campaign ?? null,
      term: urlQuery?.utm_term ?? null,
      content: urlQuery?.utm_content ?? null,
    },
    title: cleanText(p.title),
    referrer: cleanText(p.ref, MAX_URL_LEN),
    lang: cleanText(p.lang, 35),
    screenW: cleanInt(p.w),
    screenH: cleanInt(p.h),
    vid: cleanText(p.vid, 64),
    uid: cleanText(p.uid, 128),
    props,
  };
}

/** Normalize a request body into a bounded list of v2 payloads. */
export function normalizeBatch(body: unknown): NormalizedPayload[] {
  const items = Array.isArray(body) ? body.slice(0, MAX_BATCH_SIZE) : [body];
  const out: NormalizedPayload[] = [];
  for (const item of items) {
    const normalized = normalizePayload(item);
    if (normalized) out.push(normalized);
  }
  return out;
}
