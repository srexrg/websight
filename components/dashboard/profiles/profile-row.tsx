"use client";

import Link from "next/link";
import type { ProfileRow } from "@/lib/analytics/queries";
import { countryFlag, countryName } from "@/components/dashboard/screens/shared";
import { visitorCode, visitorColor } from "@/components/dashboard/sessions/session-row";
import { formatNumber, formatRelativeTime } from "@/lib/dashboard/format";

export function profileLabel(p: Pick<ProfileRow, "userId" | "visitorId">): string {
  return p.userId ?? `Visitor ${visitorCode(p.visitorId)}`;
}

export function profileHref(site: string, p: Pick<ProfileRow, "profileKey">): string {
  return `/${site}/profiles/${encodeURIComponent(p.profileKey)}`;
}

export function ProfileRowItem({ site, p }: { site: string; p: ProfileRow }) {
  const flag = p.topCountry ? countryFlag(p.topCountry) : "";
  const name = typeof p.traits?.name === "string" ? (p.traits.name as string) : null;
  const place = p.topCountry ? countryName(p.topCountry) : "";

  return (
    <Link
      href={profileHref(site, p)}
      className="flex items-center gap-3 border-b border-border/60 px-3 py-2.5 last:border-b-0 hover:bg-secondary/50"
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: visitorColor(p.visitorId) }}
        aria-hidden
      />
      <span className="flex min-w-0 basis-[240px] flex-col">
        <span className="truncate text-[13px] font-medium text-foreground">{profileLabel(p)}</span>
        <span className="truncate text-[11.5px] text-muted-foreground">
          {[name, `${flag} ${place}`.trim()].filter(Boolean).join(" · ") || "Anonymous visitor"}
        </span>
      </span>
      <span className="hidden basis-[130px] truncate text-[12px] text-muted-foreground sm:block">
        {p.topDevice ?? "-"}
      </span>
      <span className="ml-auto flex items-center gap-4 font-mono text-[12.5px]">
        <span className="w-16 text-right text-foreground">
          {formatNumber(p.sessions)} <span className="text-[10px] text-muted-foreground">sess</span>
        </span>
        <span className="hidden w-16 text-right text-foreground sm:inline">
          {formatNumber(p.pageviews)} <span className="text-[10px] text-muted-foreground">pv</span>
        </span>
        <span className="w-20 text-right text-muted-foreground">{formatRelativeTime(p.lastSeen)}</span>
      </span>
    </Link>
  );
}
