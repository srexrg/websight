"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowClockwise,
  CaretLeft,
  FilmSlate,
  Pause,
  Play,
  SpinnerGap,
  Trash,
} from "@phosphor-icons/react";
import type { ReplayChunkRef } from "@/lib/analytics/queries";
import { useReplayDetail, useSessionEvents } from "@/lib/dashboard/use-analytics";
import { countryFlag, countryName } from "@/components/dashboard/screens/shared";
import { formatDuration } from "@/lib/dashboard/format";
import { buildReplayTimeline } from "@/lib/replay/markers";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PlayerHandle } from "./player";
import { PlayerControls } from "./player-controls";
import { PlayerTimeline } from "./player-timeline";
import {
  ExpiredChip,
  LiveChip,
  VisitorDot,
  formatBytes,
  replayVisitorLabel,
} from "./shared";

const Player = dynamic(() => import("./player"), {
  ssr: false,
  loading: () => <div className="h-[420px] w-full animate-pulse rounded-lg bg-white/5" />,
});

/** Solved chunk-loading pipeline (docs/redesign/24): fetch, gunzip, parse. */
async function loadChunk(ref: ReplayChunkRef): Promise<unknown[]> {
  const res = await fetch(ref.url);
  if (!res.ok) throw new Error(`chunk ${ref.seq} failed (${res.status})`);
  if (!ref.gz) return (await res.json()) as unknown[];
  const stream = res.body!.pipeThrough(new DecompressionStream("gzip"));
  return JSON.parse(await new Response(stream).text()) as unknown[];
}

function BackLink({ site }: { site: string }) {
  return (
    <Link
      href={`/${site}/replays`}
      className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
    >
      <CaretLeft size={13} /> All replays
    </Link>
  );
}

/** Centered card for expired / empty / not-found terminal states. */
function Tombstone({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-border bg-card p-8 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <div className="max-w-md text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <FilmSlate size={20} />
        </span>
        <h2 className="mt-3 text-[16px] font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

type ChunkState = "loading" | "ready" | "error";

export function ReplayPlayerScreen({ site, recordingId }: { site: string; recordingId: string }) {
  const router = useRouter();
  const detailQ = useReplayDetail(site, recordingId);
  const recording = detailQ.data?.recording ?? null;
  const chunks = detailQ.data?.chunks ?? [];

  const eventsQ = useSessionEvents(site, recording?.sessionId ?? null, recording?.isOpen ?? false);

  // ---- chunk load pipeline -------------------------------------------------
  const [chunkState, setChunkState] = useState<ChunkState>("loading");
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });
  const [rrwebEvents, setRrwebEvents] = useState<unknown[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  // Kicks off the S3 chunk download and syncs its progress into React; the
  // synchronous resets here are intentional external-system synchronisation.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!detailQ.data) return;
    const ordered = [...detailQ.data.chunks].sort((a, b) => a.seq - b.seq);
    if (ordered.length === 0) {
      setRrwebEvents([]);
      setChunkState("ready");
      return;
    }
    let cancelled = false;
    setChunkState("loading");
    setProgress({ loaded: 0, total: ordered.length });
    (async () => {
      try {
        const parts = await Promise.all(
          ordered.map(async (ref) => {
            const arr = await loadChunk(ref);
            if (!cancelled) setProgress((p) => ({ loaded: p.loaded + 1, total: ordered.length }));
            return arr;
          }),
        );
        if (cancelled) return;
        setRrwebEvents(parts.flat());
        setChunkState("ready");
      } catch {
        if (!cancelled) setChunkState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detailQ.data, reloadKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Presigned URLs live ~10 minutes; a retry refetches the detail for fresh
  // URLs and forces the pipeline to re-run even if the payload is unchanged.
  const retry = useCallback(() => {
    detailQ.refetch();
    setReloadKey((k) => k + 1);
  }, [detailQ]);

  // ---- player wiring -------------------------------------------------------
  const handleRef = useRef<PlayerHandle | null>(null);
  const [currentMs, setCurrentMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [skipInactive, setSkipInactive] = useState(false);
  const [playerDurationMs, setPlayerDurationMs] = useState(0);

  const onReady = useCallback((handle: PlayerHandle) => {
    handleRef.current = handle;
  }, []);
  const onTime = useCallback((ms: number) => setCurrentMs(ms), []);
  const onPlayingChange = useCallback((p: boolean) => setPlaying(p), []);
  const onDuration = useCallback((ms: number) => setPlayerDurationMs(ms), []);

  const startMs = recording ? new Date(recording.startedAt).getTime() : 0;
  // Prefer rrweb's own total time (the scrubber must max exactly where playback
  // ends); fall back to the recording's stored duration until it is known.
  const durationMs = playerDurationMs || (recording ? recording.durationS * 1000 : 0);

  const seek = useCallback(
    (offsetMs: number) => {
      if (durationMs <= 0) return;
      handleRef.current?.goto(Math.min(Math.max(0, offsetMs), durationMs));
    },
    [durationMs],
  );
  const playPause = useCallback(() => {
    const h = handleRef.current;
    if (!h) return;
    if (playing) h.pause();
    else h.play();
  }, [playing]);
  const changeSpeed = useCallback((s: number) => {
    setSpeed(s);
    handleRef.current?.setSpeed(s);
  }, []);
  const changeSkip = useCallback((v: boolean) => {
    setSkipInactive(v);
    handleRef.current?.toggleSkipInactive(v);
  }, []);

  // Pause while scrubbing so the playhead does not fight the drag.
  const wasPlayingRef = useRef(false);
  const onScrub = useCallback(
    (active: boolean) => {
      if (active) {
        wasPlayingRef.current = playing;
        handleRef.current?.pause();
      } else if (wasPlayingRef.current) {
        handleRef.current?.play();
      }
    },
    [playing],
  );

  // ---- scrubber timeline (markers + activity shading) ----------------------
  const { markers, activity } = useMemo(
    () =>
      buildReplayTimeline({
        rrwebEvents: rrwebEvents as { type: number; timestamp: number }[],
        sessionEvents: eventsQ.data,
        startMs,
        durationMs,
      }),
    [rrwebEvents, eventsQ.data, startMs, durationMs],
  );

  // ---- keyboard shortcuts --------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === " " || e.key === "k") {
        if (t?.tagName === "BUTTON") return; // let the focused button handle it
        e.preventDefault();
        playPause();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        seek(currentMs + 10_000);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        seek(currentMs - 10_000);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playPause, seek, currentMs]);

  // ---- fullscreen ----------------------------------------------------------
  const stageWrapRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const onFs = () => setFullscreen(document.fullscreenElement === stageWrapRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen();
    else stageWrapRef.current?.requestFullscreen?.();
  }, []);

  // ---- click-to-pause overlay (flash icon) ---------------------------------
  const [flash, setFlash] = useState<"play" | "pause" | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayClick = useCallback(() => {
    setFlash(playing ? "pause" : "play");
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 650);
    playPause();
  }, [playing, playPause]);

  // ---- container measurement (drives rrweb-player width) -------------------
  const [width, setWidth] = useState(0);
  const roRef = useRef<ResizeObserver | null>(null);
  const measureRef = useCallback((el: HTMLDivElement | null) => {
    roRef.current?.disconnect();
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setWidth(Math.floor(entries[0].contentRect.width));
    });
    ro.observe(el);
    roRef.current = ro;
  }, []);

  // ---- top-level states ----------------------------------------------------
  if (detailQ.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink site={site} />
        <div className="h-16 w-full animate-pulse rounded-2xl bg-secondary" />
        <div className="h-[460px] w-full animate-pulse rounded-2xl bg-secondary" />
      </div>
    );
  }
  if (detailQ.isError) {
    const notFound = /\(404\)/.test(detailQ.error?.message ?? "");
    return (
      <div className="flex flex-col gap-4">
        <BackLink site={site} />
        <Tombstone
          title={notFound ? "Recording not found" : "Could not load this recording"}
          body={
            notFound
              ? "This replay does not exist, or it has already been deleted."
              : "Something went wrong loading the recording. Try again in a moment."
          }
        />
      </div>
    );
  }
  if (!recording) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink site={site} />
        <Tombstone
          title="Recording not found"
          body="This replay does not exist, or it has already been deleted."
        />
      </div>
    );
  }

  const live = recording.isOpen && recording.status === "active";
  const flag = recording.country ? countryFlag(recording.country) : "";
  const place = recording.country ? countryName(recording.country) : null;
  const device = [recording.browser, recording.os].filter(Boolean).join(" · ");
  const profileHref = `/${site}/profiles/${encodeURIComponent(
    recording.userId ?? recording.visitorId,
  )}`;

  const expired = recording.status === "expired";
  const noData = chunks.length === 0;
  const tooShort = chunkState === "ready" && rrwebEvents.length < 2;

  return (
    <div className="flex flex-col gap-4">
      <BackLink site={site} />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <VisitorDot id={recording.visitorId} size={10} />
            <Link href={profileHref} className="truncate text-[14px] font-semibold text-foreground hover:text-brand">
              {replayVisitorLabel(recording)}
            </Link>
            {live && <LiveChip />}
            {expired && <ExpiredChip />}
          </div>
          <dl className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted-foreground">
            <span className="font-mono">{formatDuration(recording.durationS)}</span>
            <span className="font-mono">
              {recording.pageCount} page{recording.pageCount === 1 ? "" : "s"}
            </span>
            {device && <span>{device}</span>}
            {(flag || place) && (
              <span className="flex items-center gap-1">
                {flag && <span>{flag}</span>}
                {place && <span>{place}</span>}
              </span>
            )}
            <span className="font-mono">{formatBytes(recording.bytes)}</span>
          </dl>
        </div>
        <DeleteButton site={site} recordingId={recordingId} onDeleted={() => router.push(`/${site}/replays`)} />
      </div>

      {/* Terminal states vs the player */}
      {expired ? (
        <Tombstone
          title="This recording has expired"
          body="It was removed under the site's replay retention policy. The metadata remains, but the snapshots are gone."
        />
      ) : noData ? (
        <Tombstone
          title="No snapshot data stored"
          body="This recording has no stored chunks to play back. It may have been captured before any snapshot was flushed."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          {/* Player column */}
          <div className="min-w-0">
            <div
              ref={stageWrapRef}
              className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]"
            >
              {/* Stage: a dark screen framing the recorded viewport */}
              <div className="relative flex flex-1 items-center justify-center bg-[#0B0F0D] p-3">
                {chunkState === "loading" ? (
                  <div className="flex h-[420px] w-full flex-col items-center justify-center gap-2 text-[#9aa4af]">
                    <SpinnerGap size={22} className="animate-spin" />
                    <span className="font-mono text-[12px]">
                      loading {progress.loaded}/{progress.total || "…"}
                    </span>
                  </div>
                ) : chunkState === "error" ? (
                  <div className="flex h-[420px] w-full flex-col items-center justify-center gap-3 text-[#9aa4af]">
                    <p className="text-[13px]">Could not download the recording.</p>
                    <button
                      type="button"
                      onClick={retry}
                      className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-[12.5px] font-medium text-brand-foreground hover:opacity-90"
                    >
                      <ArrowClockwise size={14} /> Retry
                    </button>
                  </div>
                ) : tooShort ? (
                  <div className="flex h-[420px] w-full flex-col items-center justify-center gap-1 px-6 text-center text-[#9aa4af]">
                    <p className="text-[13px] font-medium">Not enough was captured to play</p>
                    <p className="text-[12px]">This recording holds too few snapshots to reconstruct playback.</p>
                  </div>
                ) : (
                  <div className="w-full" ref={measureRef}>
                    <Player
                      events={rrwebEvents}
                      width={width}
                      onTime={onTime}
                      onReady={onReady}
                      onPlayingChange={onPlayingChange}
                      onDuration={onDuration}
                    />
                    {/* Click-to-pause overlay + flash */}
                    <button
                      type="button"
                      aria-label={playing ? "Pause" : "Play"}
                      onClick={overlayClick}
                      className="absolute inset-0 flex items-center justify-center bg-transparent"
                    >
                      {flash && (
                        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/55 text-white [animation:wsFlash_650ms_ease-out]">
                          {flash === "play" ? (
                            <Play size={26} weight="fill" className="ml-[2px]" />
                          ) : (
                            <Pause size={26} weight="fill" />
                          )}
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Custom control bar (only when the player is live) */}
              {chunkState === "ready" && !tooShort && (
                <PlayerControls
                  playing={playing}
                  durationMs={durationMs}
                  currentMs={currentMs}
                  speed={speed}
                  skipInactive={skipInactive}
                  markers={markers}
                  activity={activity}
                  fullscreen={fullscreen}
                  onPlayPause={playPause}
                  onSeek={seek}
                  onScrub={onScrub}
                  onSpeed={changeSpeed}
                  onSkipInactive={changeSkip}
                  onToggleFullscreen={toggleFullscreen}
                />
              )}
            </div>
          </div>

          {/* Session event timeline */}
          <aside className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]">
            <header className="border-b border-border px-3 py-2.5">
              <h3 className="text-[13px] font-semibold text-foreground">Timeline</h3>
              <p className="text-[11px] text-muted-foreground">Click an event to jump the playhead.</p>
            </header>
            <div className="max-h-[560px] overflow-y-auto">
              <PlayerTimeline
                events={eventsQ.data}
                isPending={eventsQ.isLoading}
                isError={eventsQ.isError}
                startMs={startMs}
                currentMs={currentMs}
                onSeek={seek}
                emptyHint={
                  recording?.sessionId
                    ? "This session has no recorded events."
                    : "This recording was never linked to a session, so it has no event timeline."
                }
              />
            </div>
          </aside>
        </div>
      )}

      {/* Flash keyframes (scoped) */}
      <style>{`@keyframes wsFlash { 0% { opacity: .9; transform: scale(.8) } 100% { opacity: 0; transform: scale(1.15) } }`}</style>
    </div>
  );
}

/** Delete control + confirm dialog, split out to keep the screen body readable. */
function DeleteButton({
  site,
  recordingId,
  onDeleted,
}: {
  site: string;
  recordingId: string;
  onDeleted: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  async function onDelete() {
    setDeleting(true);
    setDeleteError(false);
    try {
      const res = await fetch(`/api/sites/${site}/replays/${recordingId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      onDeleted();
    } catch {
      setDeleteError(true);
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setDeleteError(false);
          setConfirmOpen(true);
        }}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[12.5px] text-muted-foreground hover:border-danger/40 hover:bg-danger/10 hover:text-danger"
      >
        <Trash size={14} /> Delete
      </button>
      <Dialog open={confirmOpen} onOpenChange={(o) => !deleting && setConfirmOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this recording</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 text-[13px] leading-relaxed text-muted-foreground">
            <p>
              This permanently removes the recording and its stored snapshots. It cannot be undone,
              and the visitor&apos;s other data is unaffected.
            </p>
            {deleteError && (
              <p className="rounded-md border border-danger/40 bg-danger/10 px-2.5 py-1.5 text-[12px] text-danger">
                Could not delete the recording. Please try again.
              </p>
            )}
          </div>
          <DialogFooter>
            <button
              type="button"
              disabled={deleting}
              onClick={() => setConfirmOpen(false)}
              className="rounded-md border border-border px-3 py-1.5 text-[13px] text-foreground hover:bg-secondary disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 rounded-md bg-danger px-3 py-1.5 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {deleting && <SpinnerGap size={14} className="animate-spin" />}
              Delete recording
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
