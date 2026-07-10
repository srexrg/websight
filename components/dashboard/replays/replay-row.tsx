"use client";

import Link from "next/link";
import { MonitorPlay } from "@phosphor-icons/react";
import type { ReplayRow } from "@/lib/analytics/queries";
import { countryFlag, countryName } from "@/components/dashboard/screens/shared";
import { formatDuration, formatRelativeTime } from "@/lib/dashboard/format";
import {
  ExpiredChip,
  LiveChip,
  VisitorDot,
  formatBytes,
  replayVisitorLabel,
} from "./shared";

/**
 * One row in the Replays list (docs/redesign/24). Mirrors SessionRowItem's
 * density and columns; active/complete recordings link to the player, expired
 * ones are inert with a tooltip explaining why.
 */
export function ReplayRowItem({ site, r }: { site: string; r: ReplayRow }) {
  const expired = r.status === "expired";
  const live = r.isOpen && r.status === "active";
  const flag = r.country ? countryFlag(r.country) : "";
  const place = r.country ? countryName(r.country) : "Unknown";
  const device = [r.browser, r.os].filter(Boolean).join(" · ");

  const inner = (
    <>
      {/* Play affordance */}
      <MonitorPlay
        size={17}
        weight={live ? "fill" : "regular"}
        className={`shrink-0 ${expired ? "text-muted-foreground/40" : "text-muted-foreground group-hover:text-brand"}`}
      />

      {/* Visitor + when */}
      <span className="flex min-w-0 basis-[168px] flex-col">
        <span className="flex items-center gap-1.5">
          <VisitorDot id={r.visitorId} size={8} />
          <span className={`truncate text-[13px] font-medium ${expired ? "text-muted-foreground" : "text-foreground"}`}>
            {replayVisitorLabel(r)}
          </span>
          {live && <LiveChip />}
          {expired && <ExpiredChip />}
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {formatRelativeTime(r.startedAt)}
        </span>
      </span>

      {/* Location */}
      <span className="hidden min-w-0 basis-[128px] items-center gap-1.5 truncate text-[12.5px] text-muted-foreground sm:flex">
        {flag && <span className="shrink-0">{flag}</span>}
        <span className="truncate">{place}</span>
      </span>

      {/* Entry path + device */}
      <span className="hidden min-w-0 flex-1 flex-col md:flex">
        <span className="truncate font-mono text-[12px] text-foreground">{r.entryPath ?? "-"}</span>
        <span className="truncate font-mono text-[11px] text-muted-foreground">{device || "-"}</span>
      </span>

      {/* Metrics */}
      <span className="ml-auto flex shrink-0 items-center gap-2.5">
        <span className="w-11 text-right font-mono text-[12.5px] text-foreground">
          {r.pageCount} <span className="text-[10px] text-muted-foreground">pg</span>
        </span>
        <span className="w-14 text-right font-mono text-[12.5px] text-muted-foreground">
          {formatDuration(r.durationS)}
        </span>
        <span className="hidden w-16 text-right font-mono text-[11.5px] text-muted-foreground sm:inline">
          {formatBytes(r.bytes)}
        </span>
      </span>
    </>
  );

  const base =
    "flex w-full items-center gap-3 border-b border-border/60 px-3 py-2 text-left last:border-b-0";

  if (expired) {
    return (
      <div
        title="Expired per the site's retention policy"
        className={`${base} cursor-not-allowed opacity-70`}
      >
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={`/${site}/replays/${r.id}`}
      title={`Watch replay · ${r.entryPath ?? "/"}`}
      className={`${base} group hover:bg-secondary/50`}
    >
      {inner}
    </Link>
  );
}
