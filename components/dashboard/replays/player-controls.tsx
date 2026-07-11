"use client";

import { useEffect, useRef, useState } from "react";
import {
  CaretDown,
  CornersIn,
  CornersOut,
  FastForward,
  Pause,
  Play,
} from "@phosphor-icons/react";
import type { ActivityPeriod, ReplayMarker } from "@/lib/replay/markers";
import { PlayerScrubber } from "./player-scrubber";

const SPEEDS = [0.5, 1, 2, 4, 8];

function timeLabel(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * The custom control bar under the replay stage (docs/redesign/24). Every control
 * is ours - play/pause, the marker scrubber, a mono time readout, a speed menu,
 * a skip-idle toggle and fullscreen - styled to the dashboard tokens so nothing
 * of rrweb's default chrome shows through.
 */
export function PlayerControls({
  playing,
  durationMs,
  currentMs,
  speed,
  skipInactive,
  markers,
  activity,
  fullscreen,
  onPlayPause,
  onSeek,
  onScrub,
  onSpeed,
  onSkipInactive,
  onToggleFullscreen,
}: {
  playing: boolean;
  durationMs: number;
  currentMs: number;
  speed: number;
  skipInactive: boolean;
  markers: ReplayMarker[];
  activity: ActivityPeriod[];
  fullscreen: boolean;
  onPlayPause: () => void;
  onSeek: (offsetMs: number) => void;
  onScrub?: (active: boolean) => void;
  onSpeed: (speed: number) => void;
  onSkipInactive: (skip: boolean) => void;
  onToggleFullscreen: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-t border-border bg-card px-3 py-3">
      <button
        type="button"
        onClick={onPlayPause}
        aria-label={playing ? "Pause" : "Play"}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground transition-transform hover:scale-105 active:scale-95"
      >
        {playing ? (
          <Pause size={15} weight="fill" />
        ) : (
          <Play size={15} weight="fill" className="ml-[1px]" />
        )}
      </button>

      <PlayerScrubber
        durationMs={durationMs}
        currentMs={currentMs}
        markers={markers}
        activity={activity}
        onSeek={onSeek}
        onScrub={onScrub}
      />

      <span className="shrink-0 font-mono text-[11.5px] tabular-nums text-muted-foreground">
        <span className="text-foreground">{timeLabel(currentMs)}</span> / {timeLabel(durationMs)}
      </span>

      <SpeedMenu speed={speed} onSpeed={onSpeed} />

      <button
        type="button"
        onClick={() => onSkipInactive(!skipInactive)}
        aria-pressed={skipInactive}
        title="Skip idle stretches"
        className={`hidden shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[11.5px] font-medium transition-colors sm:inline-flex ${
          skipInactive
            ? "border-brand/30 bg-brand/10 text-brand"
            : "border-border text-muted-foreground hover:bg-secondary"
        }`}
      >
        <FastForward size={13} weight={skipInactive ? "fill" : "regular"} /> Skip idle
      </button>

      <button
        type="button"
        onClick={onToggleFullscreen}
        aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
        title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        {fullscreen ? <CornersIn size={16} /> : <CornersOut size={16} />}
      </button>
    </div>
  );
}

function SpeedMenu({ speed, onSpeed }: { speed: number; onSpeed: (n: number) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Playback speed"
        aria-expanded={open}
        className="flex items-center gap-0.5 rounded-md border border-border px-1.5 py-1 font-mono text-[11.5px] tabular-nums text-foreground transition-colors hover:bg-secondary"
      >
        {speed}×
        <CaretDown size={10} className="text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute bottom-[calc(100%+6px)] right-0 z-10 flex flex-col overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-[0_8px_24px_rgba(16,24,40,.12)]">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                onSpeed(s);
                setOpen(false);
              }}
              className={`rounded-md px-3 py-1 text-left font-mono text-[11.5px] tabular-nums transition-colors ${
                s === speed
                  ? "bg-brand/10 text-brand"
                  : "text-foreground hover:bg-secondary"
              }`}
            >
              {s}×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
