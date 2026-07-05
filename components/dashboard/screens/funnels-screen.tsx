"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFunnels } from "@/lib/dashboard/use-analytics";
import { EmptyState, ErrorState, RowsSkeleton } from "@/components/dashboard/states";
import { FunnelRow } from "@/components/dashboard/funnels/funnel-row";

export function FunnelsScreen({ site }: { site: string }) {
  const q = useFunnels(site);
  const qc = useQueryClient();
  const funnels = q.data ?? [];

  const archive = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sites/${site}/funnels/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("archive failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["funnels", site] }),
  });

  return (
    <section className="flex flex-col rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <header className="flex items-center justify-between gap-2 px-[18px] pb-2 pt-4">
        <h3 className="text-[14.5px] font-semibold text-foreground">Funnels</h3>
        <Link
          href={`/${site}/funnels/new`}
          className="rounded-md bg-brand px-2.5 py-1 text-[12.5px] font-medium text-brand-foreground hover:opacity-90"
        >
          + New funnel
        </Link>
      </header>

      <div className="px-1.5 pb-2">
        {q.isPending ? (
          <RowsSkeleton rows={4} />
        ) : q.isError ? (
          <ErrorState message="Could not load funnels." />
        ) : funnels.length === 0 ? (
          <EmptyState
            title="No funnels yet"
            hint="Build a multi-step funnel to see where visitors drop off between pages, events, and goals."
          />
        ) : (
          funnels.map((f) => <FunnelRow key={f.id} site={site} funnel={f} onArchive={(id) => archive.mutate(id)} />)
        )}
      </div>
    </section>
  );
}
