/**
 * Shared types for the v2 analytics pipeline (docs/redesign/02).
 */

/** Payload sent by the v2 tracker (docs/redesign/01, single shape for all events). */
export type TrackPayload = {
  /** Site public_id or a registered domain. */
  site: string;
  /** Event name: pageview | outbound_click | download | form_submit | web_vital | error | custom. */
  name: string;
  /** Full URL or path of the page the event happened on. */
  url: string;
  /** Referrer URL (document.referrer). */
  ref?: string;
  title?: string;
  /** Screen width/height. */
  w?: number;
  h?: number;
  lang?: string;
  /** Persistent-mode visitor id (localStorage). Ignored in stateless mode. */
  vid?: string;
  /** identify()'d user id (persistent mode only). */
  uid?: string;
  props?: Record<string, unknown>;
  /** Client timestamp (ms). Used only for ordering within a batch. */
  ts?: number;
  sdk?: string;
};

/** Legacy payload from the removed tracker.js (endpoint still accepts it during the dual-write window). */
export type LegacyTrackPayload = {
  domain: string;
  url: string;
  path?: string;
  event: string;
  source?: string;
  utm?: { source?: string; medium?: string; campaign?: string };
  user_agent?: string;
  visitor_id?: string;
  session_id?: string;
  screen?: { width?: number; height?: number };
  language?: string;
};

/** Row shape accepted by the ingest_event RPC (jsonb array elements). */
export type IngestEventRow = {
  site_id: string;
  name: string;
  visitor_id: string;
  path: string;
  url_query?: Record<string, string> | null;
  title?: string | null;
  referrer?: string | null;
  referrer_domain?: string | null;
  channel?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  device_type?: string | null;
  browser?: string | null;
  browser_version?: string | null;
  os?: string | null;
  os_version?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  lang?: string | null;
  screen_w?: number | null;
  screen_h?: number | null;
  user_id?: string | null;
  props?: Record<string, unknown> | null;
  created_at?: string;
  /** false for server-emitted events that must not open/touch a session. */
  sessionize?: boolean;
};

export type Site = {
  id: string;
  public_id: string;
  name: string;
  domains: string[];
  privacy_mode: "stateless" | "persistent";
  settings: Record<string, unknown>;
  timezone: string;
  user_id: string | null;
};

export type GeoInfo = {
  country: string | null;
  region: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
};

export type DeviceInfo = {
  device_type: string;
  browser: string | null;
  browser_version: string | null;
  os: string | null;
  os_version: string | null;
};

export type Channel =
  | "Direct"
  | "Organic Search"
  | "Social"
  | "Email"
  | "Paid"
  | "Referral";
