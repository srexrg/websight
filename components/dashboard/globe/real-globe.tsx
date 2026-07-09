"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

/**
 * Stylized "light" 3D data globe (docs/redesign/06), matching the rybbit /
 * Mapbox-Standard aesthetic: light sky-blue oceans, soft light land, a bright
 * white-blue atmosphere halo, and a dark starfield. Built as a MapLibre GL v5
 * globe over public-domain Natural Earth vectors (land + lakes + admin borders)
 * served locally - no tiles, no API key, no attribution/watermark. Visitor
 * markers are pulsing emerald dots with count badges; clicking one filters by
 * country.
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

const STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    land: { type: "geojson", data: LAND_URL },
    lakes: { type: "geojson", data: LAKES_URL },
    borders: { type: "geojson", data: BORDERS_URL },
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
  ],
};

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

  // Markers follow the data
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = points.map((p) => {
      const el = document.createElement("button");
      el.className = "ws-globe-marker";
      el.title = `${p.label} - ${p.count} visitor${p.count === 1 ? "" : "s"}`;
      el.innerHTML = `<span class="ws-globe-pulse"></span><span class="ws-globe-dot"></span><span class="ws-globe-count">${p.count}</span>`;
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectRef.current?.(p.code);
      });
      return new maplibregl.Marker({ element: el, opacityWhenCovered: "0.1" })
        .setLngLat([p.lng, p.lat])
        .addTo(map);
    });
  }, [points]);

  return <div ref={containerRef} className="h-full w-full" />;
}
