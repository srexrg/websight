"use client";

import type { ProfileRow } from "@/lib/analytics/queries";
import { countryFlag, countryName } from "@/components/dashboard/screens/shared";
import { profileLabel } from "./profile-row";
import { formatNumber, formatRelativeTime } from "@/lib/dashboard/format";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-mono text-[16px] font-semibold text-foreground">{value}</div>
    </div>
  );
}

export function ProfileHeader({ profile }: { profile: ProfileRow }) {
  const traits = Object.entries(profile.traits ?? {});
  const flag = profile.topCountry ? countryFlag(profile.topCountry) : "";
  const place = profile.topCountry ? countryName(profile.topCountry) : "Unknown";

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-[18px] font-semibold text-foreground">{profileLabel(profile)}</h2>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            {`${flag} ${place}`.trim()} · {profile.topDevice ?? "-"}
          </p>
        </div>
        {profile.userId && (
          <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">
            Identified
          </span>
        )}
      </div>

      {traits.length > 0 && (
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 border-t border-border/60 pt-3">
          {traits.map(([k, v]) => (
            <div key={k} className="flex flex-col">
              <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</dt>
              <dd className="text-[12.5px] text-foreground">
                {typeof v === "object" ? JSON.stringify(v) : String(v)}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Sessions" value={formatNumber(profile.sessions)} />
        <Metric label="Pageviews" value={formatNumber(profile.pageviews)} />
        <Metric label="First seen" value={formatRelativeTime(profile.firstSeen)} />
        <Metric label="Last seen" value={formatRelativeTime(profile.lastSeen)} />
      </div>
    </div>
  );
}
