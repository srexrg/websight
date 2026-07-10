"use client";

import rrwebPlayer from "rrweb-player";
import "rrweb-player/dist/style.css";
import { useEffect, useRef } from "react";

/**
 * Thin React shell around rrweb-player (docs/redesign/24). Loaded only via
 * next/dynamic with ssr:false, so rrweb-player never runs during SSR.
 *
 * rrweb's own controller is switched off (`showController: false`) and replaced
 * by our own React chrome (player-controls.tsx), the Rybbit approach: the packaged
 * player keeps driving the playback engine and emits time/state, while every
 * pixel of the control bar is ours and matches the dashboard design system. That
 * also sidesteps the brittle CSS recolour the built-in controller needed - which
 * had regressed to rrweb's default blue on this alpha build.
 *
 * onReady hands back an imperative handle (play/pause/seek/speed/skip) rather than
 * a forwarded ref, which next/dynamic does not thread through. onTime reports the
 * playhead; onPlayingChange tracks play/pause; onDuration reports rrweb's own
 * total time so the scrubber maxes exactly where playback does.
 */

export type SeekFn = (offsetMs: number, play?: boolean) => void;

export type PlayerHandle = {
  play: () => void;
  pause: () => void;
  goto: SeekFn;
  setSpeed: (speed: number) => void;
  toggleSkipInactive: (skip: boolean) => void;
};

type Instance = {
  goto: (t: number, play?: boolean) => void;
  play?: () => void;
  pause?: () => void;
  setSpeed?: (speed: number) => void;
  toggleSkipInactive?: () => void;
  addEventListener: (event: string, handler: (params: unknown) => void) => void;
  getMetaData?: () => { totalTime: number };
  $set?: (props: Record<string, unknown>) => void;
  $destroy?: () => void;
  triggerResize?: () => void;
};

function frameHeight(width: number): number {
  return Math.round(Math.min(Math.max(width * 0.6, 320), 720));
}

export default function Player({
  events,
  width,
  onTime,
  onReady,
  onPlayingChange,
  onDuration,
}: {
  events: unknown[];
  width: number;
  onTime?: (ms: number) => void;
  onReady?: (handle: PlayerHandle) => void;
  onPlayingChange?: (playing: boolean) => void;
  onDuration?: (ms: number) => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Instance | null>(null);
  const skipRef = useRef(false);
  const cbRef = useRef({ onTime, onReady, onPlayingChange, onDuration });
  const widthRef = useRef(width);
  useEffect(() => {
    cbRef.current = { onTime, onReady, onPlayingChange, onDuration };
    widthRef.current = width;
  });

  // The first render measures 0 width (the ResizeObserver has not fired yet), so
  // creation must re-run when a usable width first appears - hence the hasWidth
  // dep. Later resizes go through the $set effect below instead of recreating.
  const hasWidth = width > 0;
  useEffect(() => {
    const el = mountRef.current;
    if (!el || !hasWidth) return;
    const w = widthRef.current;
    const player = new rrwebPlayer({
      target: el,
      props: {
        events: events as never,
        width: w,
        height: frameHeight(w),
        autoPlay: false,
        skipInactive: false,
        showController: false,
        speedOption: [1, 2, 4, 8],
      },
    }) as unknown as Instance;

    player.addEventListener("ui-update-current-time", (params) => {
      const ms = (params as { payload?: number })?.payload;
      if (typeof ms === "number") cbRef.current.onTime?.(ms);
    });
    player.addEventListener("ui-update-player-state", (params) => {
      const state = (params as { payload?: string })?.payload;
      if (state) cbRef.current.onPlayingChange?.(state === "playing");
    });
    player.addEventListener("finish", () => cbRef.current.onPlayingChange?.(false));

    playerRef.current = player;
    skipRef.current = false;
    cbRef.current.onDuration?.(player.getMetaData?.().totalTime ?? 0);
    cbRef.current.onReady?.({
      play: () => player.play?.(),
      pause: () => player.pause?.(),
      goto: (offsetMs, play) => player.goto(Math.max(0, Math.round(offsetMs)), play),
      setSpeed: (speed) => player.setSpeed?.(speed),
      toggleSkipInactive: (skip) => {
        if (skip !== skipRef.current) {
          player.toggleSkipInactive?.();
          skipRef.current = skip;
        }
      },
    });

    return () => {
      player.$destroy?.();
      playerRef.current = null;
      el.replaceChildren();
    };
    // Re-create only for a new recording or when width first becomes usable;
    // width itself is read through widthRef so resizes never tear down playback.
  }, [events, hasWidth]);

  // Resize the existing instance in place rather than tearing down playback.
  useEffect(() => {
    const p = playerRef.current;
    if (!p || width <= 0) return;
    p.$set?.({ width, height: frameHeight(width) });
    p.triggerResize?.();
  }, [width]);

  return (
    <>
      <style>{PLAYER_CSS}</style>
      <div ref={mountRef} className="ws-rrweb" />
    </>
  );
}

// With the controller hidden, rrweb-player is just the recorded frame. Strip its
// default card chrome (shadow, radius, background) so our own stage frames it.
const PLAYER_CSS = `
.ws-rrweb .rr-player { margin: 0 auto; background: transparent; box-shadow: none; border-radius: 0; }
.ws-rrweb .rr-player__frame { background: #fff; border-radius: 8px; overflow: hidden; }
`;
