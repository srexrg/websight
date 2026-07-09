/**
 * Approximate country centroids (lat, lng) for the globe (docs/redesign/06).
 * City-level coordinates arrive when lat/lng is stored at ingest; until then
 * live points render at country level, which matches the side panel counts.
 * Unlisted countries simply don't render a point (the list still shows them).
 */
export const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  US: [39.8, -98.6], CA: [56.1, -106.3], MX: [23.6, -102.5], BR: [-14.2, -51.9],
  AR: [-38.4, -63.6], CL: [-35.7, -71.5], CO: [4.6, -74.3], PE: [-9.2, -75.0],
  VE: [6.4, -66.6], EC: [-1.8, -78.2], UY: [-32.5, -55.8], BO: [-16.3, -63.6],
  GB: [54.0, -2.5], IE: [53.4, -8.2], FR: [46.6, 2.2], DE: [51.2, 10.4],
  ES: [40.5, -3.7], PT: [39.4, -8.2], IT: [42.5, 12.5], NL: [52.1, 5.3],
  BE: [50.5, 4.5], CH: [46.8, 8.2], AT: [47.5, 14.6], PL: [51.9, 19.1],
  CZ: [49.8, 15.5], SK: [48.7, 19.7], HU: [47.2, 19.5], RO: [45.9, 25.0],
  BG: [42.7, 25.5], GR: [39.1, 21.8], SE: [62.2, 17.6], NO: [64.6, 12.7],
  DK: [56.3, 9.5], FI: [64.9, 26.3], IS: [64.9, -19.0], EE: [58.6, 25.0],
  LV: [56.9, 24.6], LT: [55.2, 23.9], UA: [48.4, 31.2], BY: [53.7, 28.0],
  RU: [61.5, 105.3], TR: [39.0, 35.2], RS: [44.0, 20.9], HR: [45.1, 15.2],
  SI: [46.2, 14.8], BA: [43.9, 17.7], AL: [41.2, 20.2], MK: [41.6, 21.7],
  MD: [47.4, 28.4], CY: [35.1, 33.4], MT: [35.9, 14.4], LU: [49.8, 6.1],
  IN: [20.6, 79.0], PK: [30.4, 69.3], BD: [23.7, 90.4], LK: [7.9, 80.8],
  NP: [28.4, 84.1], CN: [35.9, 104.2], JP: [36.2, 138.3], KR: [35.9, 127.8],
  TW: [23.7, 121.0], HK: [22.3, 114.2], SG: [1.35, 103.8], MY: [4.2, 102.0],
  TH: [15.9, 101.0], VN: [14.1, 108.3], PH: [12.9, 121.8], ID: [-0.8, 113.9],
  KH: [12.6, 105.0], MM: [21.9, 95.9], LA: [19.9, 102.5], MN: [46.9, 103.8],
  KZ: [48.0, 66.9], UZ: [41.4, 64.6], AF: [33.9, 67.7], IR: [32.4, 53.7],
  IQ: [33.2, 43.7], SA: [23.9, 45.1], AE: [23.4, 53.8], QA: [25.4, 51.2],
  KW: [29.3, 47.5], BH: [26.0, 50.5], OM: [21.5, 55.9], YE: [15.6, 48.0],
  JO: [30.6, 36.2], LB: [33.9, 35.9], SY: [34.8, 38.9], IL: [31.0, 34.9],
  PS: [31.9, 35.2], GE: [42.3, 43.4], AM: [40.1, 45.0], AZ: [40.1, 47.6],
  EG: [26.8, 30.8], LY: [26.3, 17.2], TN: [33.9, 9.6], DZ: [28.0, 1.7],
  MA: [31.8, -7.1], NG: [9.1, 8.7], GH: [7.9, -1.0], CI: [7.5, -5.5],
  SN: [14.5, -14.5], CM: [7.4, 12.4], KE: [-0.02, 37.9], ET: [9.1, 40.5],
  TZ: [-6.4, 34.9], UG: [1.4, 32.3], RW: [-1.9, 29.9], ZM: [-13.1, 27.8],
  ZW: [-19.0, 29.2], MZ: [-18.7, 35.5], AO: [-11.2, 17.9], ZA: [-30.6, 22.9],
  NA: [-22.9, 18.5], BW: [-22.3, 24.7], MG: [-18.8, 47.0], MU: [-20.3, 57.6],
  AU: [-25.3, 133.8], NZ: [-40.9, 174.9], FJ: [-17.7, 178.1], PG: [-6.3, 143.9],
  CR: [9.7, -83.8], PA: [8.5, -80.8], GT: [15.8, -90.2], HN: [15.2, -86.2],
  SV: [13.8, -88.9], NI: [12.9, -85.2], CU: [21.5, -77.8], DO: [18.7, -70.2],
  JM: [18.1, -77.3], TT: [10.7, -61.2], PR: [18.2, -66.6],
};

export function countryCoords(code: string | null | undefined): [number, number] | null {
  if (!code) return null;
  return COUNTRY_CENTROIDS[code.toUpperCase()] ?? null;
}

/** Deterministic 0..1 pair from a seed (stable across renders). */
function hash2(seed: string): [number, number] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const a = ((h >>> 0) % 1000) / 1000;
  h = Math.imul(h ^ (h >>> 13), 16777619);
  const b = ((h >>> 0) % 1000) / 1000;
  return [a, b];
}

/**
 * Deterministic scatter around a point, for placing multiple avatars near a
 * country centroid when exact coordinates aren't known. `first` keeps the
 * anchor itself un-jittered so a lone visitor sits on the centroid.
 */
export function jitterAround(
  lat: number,
  lng: number,
  seed: string,
  { spread = 2.6, first = false }: { spread?: number; first?: boolean } = {},
): [number, number] {
  if (first) return [lat, lng];
  const [a, r] = hash2(seed);
  const angle = a * Math.PI * 2;
  const radius = (0.35 + r * 0.65) * spread;
  const dLat = Math.sin(angle) * radius;
  const dLng = (Math.cos(angle) * radius) / Math.max(Math.cos((lat * Math.PI) / 180), 0.3);
  return [lat + dLat, lng + dLng];
}
