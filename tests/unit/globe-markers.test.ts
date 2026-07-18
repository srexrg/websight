/**
 * Live-globe marker placement (issue #11). Every live session must yield a
 * pin so "N online" always equals N pointers - including visitors with no CDN
 * geo (no lat/lng, no country), which the old code silently dropped.
 */
import { describe, expect, it } from "vitest";
import { fallbackCoords, markerCoords } from "@/lib/dashboard/geo";

const onGlobe = ([lat, lng]: [number, number]) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

describe("markerCoords", () => {
  it("uses exact coords when lat/lng are known", () => {
    expect(markerCoords({ id: "s1", lat: 12.5, lng: -3.2, country: "FR" })).toEqual([12.5, -3.2]);
  });

  it("scatters around the country centroid when only country is known", () => {
    const c = markerCoords({ id: "s2", lat: null, lng: null, country: "US" });
    expect(onGlobe(c)).toBe(true);
    // Near the US centroid (39.8, -98.6), not at the origin.
    expect(c[0]).toBeGreaterThan(25);
    expect(c[0]).toBeLessThan(55);
  });

  it("still places a pin when geo is entirely unknown (the bug)", () => {
    const c = markerCoords({ id: "s3", lat: null, lng: null, country: null });
    expect(onGlobe(c)).toBe(true);
  });
});

describe("fallbackCoords", () => {
  it("is deterministic per seed and lands on the globe", () => {
    const a = fallbackCoords("visitor-abc");
    expect(a).toEqual(fallbackCoords("visitor-abc"));
    expect(onGlobe(a)).toBe(true);
  });

  it("separates distinct visitors", () => {
    expect(fallbackCoords("v1")).not.toEqual(fallbackCoords("v2"));
  });
});
