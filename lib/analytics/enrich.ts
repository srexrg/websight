import { UAParser } from "ua-parser-js";
import type { DeviceInfo, GeoInfo } from "./types";

/**
 * Request enrichment: UA parsing and CDN geo headers (3-level location:
 * country/region/city on Vercel/Cloudflare).
 */

export function parseDevice(userAgent: string | null | undefined): DeviceInfo {
  if (!userAgent) {
    return {
      device_type: "desktop",
      browser: null,
      browser_version: null,
      os: null,
      os_version: null,
    };
  }

  const parser = new UAParser(userAgent);
  const device = parser.getDevice();
  const browser = parser.getBrowser();
  const os = parser.getOS();

  const rawType = device.type?.toLowerCase() ?? "";
  const device_type = rawType.includes("mobile")
    ? "mobile"
    : rawType.includes("tablet")
      ? "tablet"
      : "desktop";

  return {
    device_type,
    browser: browser.name ?? null,
    browser_version: browser.version ?? null,
    os: os.name ?? null,
    os_version: os.version ?? null,
  };
}

type HeaderGetter = { get(name: string): string | null };

function normalizeCountry(value: string | null): string | null {
  if (!value) return null;
  const c = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(c) && c !== "XX" ? c : null;
}

function decodeHeader(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function geoFromHeaders(headers: HeaderGetter): GeoInfo {
  const country = normalizeCountry(
    headers.get("cf-ipcountry") ??
      headers.get("x-vercel-ip-country") ??
      headers.get("fastly-geo-country") ??
      headers.get("cloudfront-viewer-country"),
  );
  const region = decodeHeader(
    headers.get("x-vercel-ip-country-region") ??
      headers.get("cf-region-code") ??
      headers.get("cloudfront-viewer-country-region"),
  );
  const city = decodeHeader(
    headers.get("x-vercel-ip-city") ??
      headers.get("cf-ipcity") ??
      headers.get("cloudfront-viewer-city"),
  );
  const lat = parseCoord(
    headers.get("x-vercel-ip-latitude") ??
      headers.get("cf-iplatitude") ??
      headers.get("cloudfront-viewer-latitude"),
  );
  const lng = parseCoord(
    headers.get("x-vercel-ip-longitude") ??
      headers.get("cf-iplongitude") ??
      headers.get("cloudfront-viewer-longitude"),
  );
  return { country, region, city, lat, lng };
}

/** Parse a geo-header coordinate, rounded to ~1km (2dp) for privacy. */
function parseCoord(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || Math.abs(n) > 180) return null;
  return Math.round(n * 100) / 100;
}

/** Client IP for visitor hashing (never stored). */
export function clientIp(headers: HeaderGetter): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-real-ip") ??
    "0.0.0.0"
  );
}
