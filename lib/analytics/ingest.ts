import type { SupabaseClient } from "@supabase/supabase-js";
import { classifyChannel, referrerDomain } from "./channels";
import type { NormalizedPayload } from "./payload";
import type { DeviceInfo, GeoInfo, IngestEventRow, Site } from "./types";

/**
 * Assembles enriched ingest rows and hands them to the atomic ingest_event
 * RPC (insert + sessionize + rollup in one transaction per batch).
 */

export function buildEventRow(args: {
  payload: NormalizedPayload;
  site: Site;
  visitorId: string;
  device: DeviceInfo;
  geo: GeoInfo;
  sessionize?: boolean;
}): IngestEventRow {
  const { payload, site, visitorId, device, geo } = args;

  const refDomain = referrerDomain(payload.referrer);
  const channel = classifyChannel({
    referrerDomain: refDomain,
    utmSource: payload.utm.source,
    utmMedium: payload.utm.medium,
    queryKeys: payload.queryKeys,
    siteDomains: site.domains,
  });
  const isSelfReferral =
    refDomain !== null &&
    site.domains.some((d) => refDomain === d || refDomain.endsWith(`.${d}`));

  return {
    site_id: site.id,
    name: payload.name,
    visitor_id: visitorId,
    path: payload.path,
    url_query: payload.urlQuery,
    title: payload.title,
    referrer: isSelfReferral ? null : payload.referrer,
    referrer_domain: isSelfReferral ? null : refDomain,
    channel,
    utm_source: payload.utm.source,
    utm_medium: payload.utm.medium,
    utm_campaign: payload.utm.campaign,
    utm_term: payload.utm.term,
    utm_content: payload.utm.content,
    device_type: device.device_type,
    browser: device.browser,
    browser_version: device.browser_version,
    os: device.os,
    os_version: device.os_version,
    country: geo.country,
    region: geo.region,
    city: geo.city,
    lang: payload.lang,
    screen_w: payload.screenW,
    screen_h: payload.screenH,
    user_id: site.privacy_mode === "persistent" ? payload.uid : null,
    props: payload.props,
    ...(args.sessionize === false ? { sessionize: false } : {}),
  };
}

/** Sends a batch to ingest_event. Returns the number of inserted events. */
export async function ingestEvents(
  admin: SupabaseClient,
  rows: IngestEventRow[],
): Promise<number> {
  if (rows.length === 0) return 0;
  const { data, error } = await admin.rpc("ingest_event", { p_events: rows });
  if (error) {
    throw new Error(`ingest_event failed: ${error.message}`);
  }
  return typeof data === "number" ? data : 0;
}
