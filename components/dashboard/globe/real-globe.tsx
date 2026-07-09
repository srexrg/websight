"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { COUNTRY_CENTROIDS } from "@/lib/dashboard/geo";
import { avatarDataUri } from "@/lib/dashboard/avatar";

/**
 * Stylized "light" 3D data globe (docs/redesign/06), matching the rybbit /
 * Mapbox-Standard aesthetic: light sky-blue oceans, soft light land, a bright
 * white-blue atmosphere halo, and a dark starfield. Built as a MapLibre GL v5
 * globe over public-domain Natural Earth vectors (land + lakes + admin borders)
 * served locally - no tiles, no API key. Country name labels use the free,
 * keyless openmaptiles glyph endpoint (font shapes only, no basemap/watermark).
 * Active visitors show as generated cartoon avatars (privacy-safe, anonymous)
 * scattered around their country; clicking one filters by that country.
 */

export type GlobePoint = {
  code: string;
  label: string;
  lat: number;
  lng: number;
  count: number;
};

// Public-domain Natural Earth vectors, served locally from /public/geo.
const LAND_URL = "/geo/land-50m.geojson";
const LAKES_URL = "/geo/lakes-50m.geojson";
const BORDERS_URL = "/geo/borders-110m.geojson";

const OCEAN = "#a7cee2"; // light sky-blue sea
const LAND = "#e2e3ca"; // soft light land (beige-sage)
const COAST = "#9fb6b8"; // faint coastline
const BORDER = "rgba(150,130,120,0.35)"; // subtle country borders

// Country label points, built once from the centroid table + Intl names.
const regionNames =
  typeof Intl !== "undefined" ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
const LABELS_GEOJSON: FeatureCollection = {
  type: "FeatureCollection",
  features: Object.entries(COUNTRY_CENTROIDS).map(([code, [lat, lng]]) => ({
    type: "Feature",
    geometry: { type: "Point", coordinates: [lng, lat] },
    properties: { name: (() => { try { return regionNames?.of(code) ?? code; } catch { return code; } })() },
  })),
};

const STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: "/fonts/{fontstack}/{range}.pbf", // self-hosted Open Sans, no external dep
  sources: {
    land: { type: "geojson", data: LAND_URL },
    lakes: { type: "geojson", data: LAKES_URL },
    borders: { type: "geojson", data: BORDERS_URL },
    labels: { type: "geojson", data: LABELS_GEOJSON },
  },
  layers: [
    // Background paints the globe's surface (the sea); space around the sphere
    // stays transparent so the page's dark starfield shows through.
    { id: "ocean", type: "background", paint: { "background-color": OCEAN } },
    { id: "land", type: "fill", source: "land", paint: { "fill-color": LAND } },
    { id: "lakes", type: "fill", source: "lakes", paint: { "fill-color": OCEAN } },
    {
      id: "coastline",
      type: "line",
      source: "land",
      paint: { "line-color": COAST, "line-width": 0.5, "line-opacity": 0.7 },
    },
    {
      id: "borders",
      type: "line",
      source: "borders",
      paint: { "line-color": BORDER, "line-width": 0.5 },
    },
    {
      id: "country-labels",
      type: "symbol",
      source: "labels",
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Open Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 1, 9.5, 4, 15],
        "text-padding": 6,
        "text-max-width": 7,
        "text-transform": "none",
      },
      paint: {
        "text-color": "#425058",
        "text-halo-color": "rgba(255,255,255,0.9)",
        "text-halo-width": 1.2,
        "text-opacity": ["interpolate", ["linear"], ["zoom"], 0.9, 0, 1.6, 0.85],
      },
    },
  ],
};

// Cap markers so a busy globe stays readable, not a wall of faces.
const PER_COUNTRY = 4;
const TOTAL = 55;
const SPREAD = 2.6; // degrees of scatter around the centroid

// Deterministic 0..1 pair from a seed, so a slot keeps its offset across polls.
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

type Slot = { code: string; label: string; lat: number; lng: number; seed: string };

function scatter(points: GlobePoint[]): Slot[] {
  const slots: Slot[] = [];
  for (const p of [...points].sort((a, b) => b.count - a.count)) {
    const n = Math.min(p.count, PER_COUNTRY);
    for (let i = 0; i < n && slots.length < TOTAL; i++) {
      const seed = `${p.code}-${i}`;
      // First slot sits on the centroid; the rest fan out deterministically.
      let dLat = 0;
      let dLng = 0;
      if (i > 0) {
        const [a, r] = hash2(seed);
        const angle = a * Math.PI * 2;
        const radius = (0.35 + r * 0.65) * SPREAD;
        dLat = Math.sin(angle) * radius;
        dLng = (Math.cos(angle) * radius) / Math.max(Math.cos((p.lat * Math.PI) / 180), 0.3);
      }
      slots.push({ code: p.code, label: p.label, lat: p.lat + dLat, lng: p.lng + dLng, seed });
    }
  }
  return slots;
}

export function RealGlobe({
  points,
  onSelect,
}: {
  points: GlobePoint[];
  onSelect?: (code: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const spinningRef = useRef(true);
  const [ready, setReady] = useState(false);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Map init (once)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const map = new maplibregl.Map({
      container,
      style: STYLE,
      center: [10, 22],
      zoom: 1.3,
      minZoom: 0.8,
      maxZoom: 6,
      attributionControl: false, // Natural Earth is public domain - none required
      canvasContextAttributes: { antialias: true },
    });
    mapRef.current = map;

    map.on("style.load", () => {
      map.setProjection({ type: "globe" });
      // Projection is live now - safe to attach markers (don't wait for the
      // heavy land source that 'load' would block on).
      setReady(true);
      // Bright white-blue atmosphere halo (rybbit / Mapbox Standard look).
      try {
        map.setSky({
          "sky-color": "#bcd9f0",
          "horizon-color": "#eaf4ff",
          "fog-color": "#ffffff",
          "sky-horizon-blend": 0.9,
          "horizon-fog-blend": 0.9,
          "fog-ground-blend": 0.6,
          "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 0.4],
        });
      } catch {
        /* older style spec without full sky support */
      }
    });

    // Slow auto-spin; pause while the user interacts, resume after.
    spinningRef.current = !reducedMotion;
    let raf = 0;
    let last = performance.now();
    const spin = (t: number) => {
      raf = requestAnimationFrame(spin);
      const dt = t - last;
      last = t;
      if (!spinningRef.current || map.isMoving()) return;
      const center = map.getCenter();
      center.lng += (dt / 1000) * 3; // ~3 deg/s
      map.jumpTo({ center });
    };
    if (!reducedMotion) raf = requestAnimationFrame(spin);

    const pause = () => {
      spinningRef.current = false;
    };
    const scheduleResume = () => {
      if (reducedMotion) return;
      window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => {
        spinningRef.current = true;
        last = performance.now();
      }, 5000);
    };
    let resumeTimer = 0;
    map.on("mousedown", pause);
    map.on("touchstart", pause);
    map.on("wheel", pause);
    map.on("mouseup", scheduleResume);
    map.on("touchend", scheduleResume);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(resumeTimer);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Markers follow the data - one cartoon avatar per active visitor slot.
  // Gated on `ready` so they attach after the globe projection is live.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = scatter(points).map((s, i) => {
      // Styles are set inline so they never depend on a stylesheet class. The
      // wrapper's transform belongs to MapLibre (positioning); the inner face
      // owns its own visual + hover + entrance, so nothing fights MapLibre.
      const el = document.createElement("button");
      el.type = "button";
      el.title = s.label;
      Object.assign(el.style, {
        width: "38px",
        height: "38px",
        padding: "0",
        border: "none",
        background: "none",
        cursor: "pointer",
        lineHeight: "0",
      });
      const face = document.createElement("span");
      Object.assign(face.style, {
        display: "block",
        width: "38px",
        height: "38px",
        borderRadius: "9999px",
        border: "2.5px solid #ffffff",
        backgroundColor: "#dfe7ee",
        backgroundImage: `url("${avatarDataUri(s.seed)}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        boxShadow: "0 3px 10px rgba(16,24,40,.4)",
        transition: "transform .18s cubic-bezier(.22,1,.36,1)",
      });
      el.appendChild(face);
      // Entrance pop via WAAPI (fill: none) so no lingering transform.
      face.animate(
        [
          { opacity: 0, transform: "scale(.3)" },
          { opacity: 1, transform: "scale(1)" },
        ],
        { duration: 420, delay: Math.min(i * 22, 500), easing: "cubic-bezier(.22,1,.36,1)" },
      );
      el.addEventListener("mouseenter", () => {
        face.style.transform = "scale(1.22)";
        el.style.zIndex = "10";
      });
      el.addEventListener("mouseleave", () => {
        face.style.transform = "scale(1)";
        el.style.zIndex = "";
      });
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectRef.current?.(s.code);
      });
      return new maplibregl.Marker({ element: el, opacityWhenCovered: "0.05" })
        .setLngLat([s.lng, s.lat])
        .addTo(map);
    });
  }, [points, ready]);

  return <div ref={containerRef} className="h-full w-full" />;
}
