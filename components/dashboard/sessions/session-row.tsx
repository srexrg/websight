"use client";

import { MonitorPlay } from "@phosphor-icons/react";
import type { SessionRow as Session } from "@/lib/analytics/queries";
import { countryFlag, countryName } from "@/components/dashboard/screens/shared";
import { formatDuration, formatRelativeTime } from "@/lib/dashboard/format";

function fnv1a(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Stable 4-char code from a visitor id, so distinct visitors read distinctly. */
export function visitorCode(id: string): string {
  return fnv1a(id).toString(36).slice(0, 4).padStart(4, "0");
}

/** Deterministic identicon color from a visitor id (docs/redesign/07 M5). */
export function visitorColor(id: string): string {
  return `hsl(${fnv1a(id) % 360} 62% 55%)`;
}

/** Human-friendly, non-identifying label for a visitor (identicon colors land in M5). */
export function visitorLabel(s: Pick<Session, "visitorId" | "userId">): string {
  if (s.userId) return s.userId;
  return `Visitor ${visitorCode(s.visitorId)}`;
}

function pathPair(entry: string | null, exit: string | null): string {
  const e = entry ?? "-";
  if (!exit || exit === entry) return e;
  return `${e} -> ${exit}`;
}

export function SessionRowItem({
  s,
  onOpen,
  onHover,
}: {
  s: Session;
  onOpen?: (s: Session) => void;
  onHover?: (s: Session) => void;
}) {
  const flag = s.country ? countryFlag(s.country) : "";
  const place = [s.city, s.country ? countryName(s.country) : null].filter(Boolean).join(", ");
  const device = [s.browser, s.os].filter(Boolean).join(" · ");

  return (
    <button
      type="button"
      onClick={() => onOpen?.(s)}
      onMouseEnter={() => onHover?.(s)}
      title={`View session timeline · ${s.entryPath ?? "/"}${s.exitPath && s.exitPath !== s.entryPath ? ` → ${s.exitPath}` : ""}`}
      className="group flex w-full items-center gap-3 border-b border-border/60 px-3 py-2 text-left last:border-b-0 hover:bg-secondary/50"
    >
      {/* Visitor + when */}
      <span className="flex min-w-0 basis-[168px] flex-col">
        <span className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: visitorColor(s.visitorId) }}
            aria-hidden
          />
          <span className="truncate text-[13px] font-medium text-foreground">
            {visitorLabel(s)}
          </span>
          {s.isOpen && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#12291F] px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-[#5FC2A0]">
              <span className="h-1 w-1 rounded-full bg-[#5FD3A6] [animation:wsBlink_1.4s_ease-in-out_infinite]" />
              LIVE
            </span>
          )}
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {formatRelativeTime(s.startedAt)}
        </span>
      </span>

      {/* Location */}
      <span className="hidden min-w-0 basis-[140px] items-center gap-1.5 truncate text-[12.5px] text-muted-foreground sm:flex">
        {flag && <span className="shrink-0">{flag}</span>}
        <span className="truncate">{place || "Unknown"}</span>
      </span>

      {/* Device / referrer */}
      <span className="hidden min-w-0 flex-1 flex-col md:flex">
        <span className="truncate text-[12.5px] text-foreground">{pathPair(s.entryPath, s.exitPath)}</span>
        <span className="truncate font-mono text-[11px] text-muted-foreground">
          {[device, s.referrerDomain ?? s.channel].filter(Boolean).join("  ·  ") || "-"}
        </span>
      </span>

      {/* Metrics */}
      <span className="ml-auto flex shrink-0 items-center gap-2.5">
        {s.hasReplay && (
          <MonitorPlay
            size={15}
            className="shrink-0 text-muted-foreground/60 group-hover:text-brand"
            aria-label="Session replay available"
          />
        )}
        {s.isBounce && (
          <span className="rounded-full bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
            BOUNCE
          </span>
        )}
        <span className="w-11 text-right font-mono text-[12.5px] text-foreground">
          {s.pageviews} <span className="text-[10px] text-muted-foreground">pv</span>
        </span>
        <span className="w-14 text-right font-mono text-[12.5px] text-muted-foreground">
          {formatDuration(s.durationS)}
        </span>
      </span>
    </button>
  );
}
