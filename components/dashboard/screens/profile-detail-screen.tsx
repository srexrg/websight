"use client";

import { useState } from "react";
import Link from "next/link";
import type { SessionRow } from "@/lib/analytics/queries";
import {
  useProfileDetail,
  useProfileEventFreq,
  useProfileSessions,
} from "@/lib/dashboard/use-analytics";
import { ProfileHeader } from "@/components/dashboard/profiles/profile-header";
import { profileLabel } from "@/components/dashboard/profiles/profile-row";
import { DeleteVisitorButton } from "@/components/dashboard/profiles/delete-visitor-button";
import { SessionRowItem } from "@/components/dashboard/sessions/session-row";
import { SessionDrawer } from "@/components/dashboard/sessions/session-drawer";
import { EmptyState, ErrorState, RowsSkeleton, Sk } from "@/components/dashboard/states";
import { formatNumber } from "@/lib/dashboard/format";

export function ProfileDetailScreen({ site, profileKey }: { site: string; profileKey: string }) {
  const detail = useProfileDetail(site, profileKey);
  const sessions = useProfileSessions(site, profileKey);
  const freq = useProfileEventFreq(site, profileKey);
  const [selected, setSelected] = useState<SessionRow | null>(null);

  const back = (
    <Link
      href={`/${site}/profiles`}
      className="inline-block text-[12.5px] text-muted-foreground hover:text-foreground"
    >
      &larr; All profiles
    </Link>
  );

  if (detail.isPending) {
    return (
      <div className="space-y-4">
        {back}
        <Sk className="h-44 w-full rounded-2xl" />
        <Sk className="h-64 w-full rounded-2xl" />
      </div>
    );
  }
  if (detail.isError) {
    return (
      <div className="space-y-4">
        {back}
        <ErrorState message="Could not load this profile." />
      </div>
    );
  }
  if (!detail.data) {
    return (
      <div className="space-y-4">
        {back}
        <EmptyState
          title="Profile not found"
          hint="This visitor has no sessions, or the id is invalid."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        {back}
        <DeleteVisitorButton
          site={site}
          profileKey={detail.data.profileKey}
          label={profileLabel(detail.data)}
        />
      </div>
      <ProfileHeader profile={detail.data} />

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <section className="flex flex-col rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]">
          <header className="px-[18px] pb-2 pt-4">
            <h3 className="text-[14.5px] font-semibold text-foreground">Sessions</h3>
          </header>
          <div className="px-1.5 pb-2">
            {sessions.isPending ? (
              <RowsSkeleton rows={6} />
            ) : sessions.isError ? (
              <ErrorState message="Could not load sessions." />
            ) : (sessions.data ?? []).length === 0 ? (
              <EmptyState title="No sessions" hint="This profile has no recorded sessions." />
            ) : (
              sessions.data!.map((s) => (
                <SessionRowItem key={s.id} s={s} onOpen={setSelected} />
              ))
            )}
          </div>
        </section>

        <section className="flex flex-col rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]">
          <header className="px-[18px] pb-2 pt-4">
            <h3 className="text-[14.5px] font-semibold text-foreground">Events</h3>
          </header>
          <div className="px-[18px] pb-3">
            {freq.isPending ? (
              <RowsSkeleton rows={5} />
            ) : (freq.data ?? []).length === 0 ? (
              <EmptyState title="No events" />
            ) : (
              <ul>
                {freq.data!.map((e) => (
                  <li
                    key={e.name}
                    className="flex items-center justify-between gap-2 border-b border-border/60 py-1.5 last:border-0"
                  >
                    <span className="truncate text-[12.5px] text-foreground">{e.name}</span>
                    <span className="shrink-0 font-mono text-[12.5px] text-muted-foreground">
                      {formatNumber(e.count)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <SessionDrawer site={site} session={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
