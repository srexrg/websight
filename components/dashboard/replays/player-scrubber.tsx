"use client";

import { useCallback, useRef } from "react";
import type { ActivityPeriod, MarkerKind, ReplayMarker } from "@/lib/replay/markers";

/**
 * The replay scrubber (docs/redesign/24, Rybbit-parity). Three stacked reads on
 * one track: a marker rail floating above (session-start / navigation / click /
 * rage / custom dots), activity shading on the track itself (bright = interaction,
 * dim = idle - the stretches skip-inactive jumps), and the emerald progress fill
 * with a draggable thumb. Click or drag anywhere on the track to seek; a marker
 * dot seeks to its exact moment.
 */

const MARKER_COLOR: Record<MarkerKind, string> = {
  start: "bg-brand",
  navigation: "bg-[#3B82F6]",
  click: "bg-[#8B5CF6]",
  rageclick: "bg-danger",
  deadclick: "bg-[#94A3B8]",
  custom: "bg-[#F59E0B]",
};

function offsetLabel(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function PlayerScrubber({
  durationMs,
  currentMs,
  markers,
  activity,
  onSeek,
  onScrub,
}: {
  durationMs: number;
  currentMs: number;
  markers: ReplayMarker[];
  activity: ActivityPeriod[];
  onSeek: (offsetMs: number) => void;
  onScrub?: (active: boolean) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const pct = durationMs > 0 ? clampPct((currentMs / durationMs) * 100) : 0;

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el || durationMs <= 0) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      onSeek(ratio * durationMs);
    },
    [durationMs, onSeek],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (durationMs <= 0) return;
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    onScrub?.(true);
    seekFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (draggingRef.current) seekFromClientX(e.clientX);
  };
  const endDrag = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    onScrub?.(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (durationMs <= 0) return;
    const step = 5000;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      e.stopPropagation();
      onSeek(Math.min(durationMs, currentMs + step));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      e.stopPropagation();
      onSeek(Math.max(0, currentMs - step));
    }
  };

  return (
    <div className="flex flex-1 flex-col justify-center">
      {/* Marker rail */}
      <div className="relative mb-1.5 h-2.5 w-full">
        {markers.map((m, i) => (
          <button
            key={`${m.kind}-${i}`}
            type="button"
            title={`${m.label} · ${offsetLabel(m.offsetMs)}`}
            aria-label={`Seek to ${m.label} at ${offsetLabel(m.offsetMs)}`}
            onClick={(e) => {
              e.stopPropagation();
              onSeek(m.offsetMs);
            }}
            className={`absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card transition-transform hover:scale-150 ${MARKER_COLOR[m.kind]}`}
            style={{ left: `${markerLeft(m.offsetMs, durationMs)}%` }}
          />
        ))}
      </div>

      {/* Track (click / drag to seek) */}
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(durationMs / 1000)}
        aria-valuenow={Math.round(currentMs / 1000)}
        aria-valuetext={offsetLabel(currentMs)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        className="group relative h-4 w-full cursor-pointer touch-none select-none outline-none"
      >
        {/* Base track */}
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-foreground/10" />
        {/* Activity (interaction) shading */}
        {activity.map((p, i) => {
          const left = clampPct((p.startMs / Math.max(1, durationMs)) * 100);
          const width = clampPct(((p.endMs - p.startMs) / Math.max(1, durationMs)) * 100);
          return (
            <div
              key={i}
              className="absolute top-1/2 h-1.5 -translate-y-1/2 bg-foreground/25"
              style={{ left: `${left}%`, width: `${width}%` }}
            />
          );
        })}
        {/* Progress fill */}
        <div
          className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand"
          style={{ width: `${pct}%` }}
        />
        {/* Thumb */}
        <div
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-brand bg-card shadow-sm ring-0 transition-transform group-focus-visible:ring-2 group-focus-visible:ring-brand/40 group-hover:scale-110"
          style={{ left: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function clampPct(n: number): number {
  return Math.min(100, Math.max(0, n));
}

/** Keep marker dots off the very ends so they are never clipped by the track edge. */
function markerLeft(offsetMs: number, durationMs: number): number {
  return Math.min(99.2, Math.max(0.8, (offsetMs / Math.max(1, durationMs)) * 100));
}
