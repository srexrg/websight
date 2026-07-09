"use client";

import { useState } from "react";
import { useProfiles } from "@/lib/dashboard/use-analytics";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/dashboard/states";
import { ProfileRowItem } from "@/components/dashboard/profiles/profile-row";

export function ProfilesScreen({ site }: { site: string }) {
  const [search, setSearch] = useState("");
  const q = useProfiles(site, search);
  const rows = q.data ?? [];

  return (
    <section className="flex flex-col rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <header className="flex items-center justify-between gap-2 px-[18px] pb-2 pt-4">
        <h3 className="text-[14.5px] font-semibold text-foreground">Profiles</h3>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search user or visitor id"
          className="w-60 rounded-md border border-input bg-transparent px-2.5 py-1 font-mono text-[12px] text-foreground outline-none placeholder:text-muted-foreground focus:border-ring"
        />
      </header>

      <div className="px-1.5 pb-2">
        {q.isPending ? (
          <RowsSkeleton rows={10} />
        ) : q.isError ? (
          <ErrorState message="Could not load profiles." />
        ) : rows.length === 0 ? (
          <EmptyState
            title={search ? "No profiles match your search" : "No profiles yet"}
            hint={
              search
                ? "Try a different user or visitor id."
                : "Profiles build up as identified or returning visitors accumulate sessions."
            }
          />
        ) : (
          rows.map((p) => <ProfileRowItem key={p.profileKey} site={site} p={p} />)
        )}
      </div>
    </section>
  );
}
