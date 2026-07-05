"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

/**
 * Realistic 3D globe (docs/redesign/06, DataFast-style): MapLibre GL v5
 * globe projection over OpenFreeMap's `liberty` vector style - real
 * cartography with place labels, free tiles, no API key, self-hostable.
 * Visitor markers are pulsing emerald dots with count badges; clicking
 * one applies a country filter.
 */

export type GlobePoint = {
  code: string;
  label: string;
  lat: number;
  lng: number;
  count: number;
};

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

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
      style: STYLE_URL,
      center: [10, 22],
      zoom: 1.3,
      minZoom: 0.8,
      maxZoom: 6,
      attributionControl: { compact: true },
      canvasContextAttributes: { antialias: true },
    });
    mapRef.current = map;

    map.on("style.load", () => {
      map.setProjection({ type: "globe" });
      try {
        map.setSky({
          "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 6, 0],
        });
      } catch {
        /* older style spec without sky support */
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
