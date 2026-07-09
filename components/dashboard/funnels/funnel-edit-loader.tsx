"use client";

import { useFunnels } from "@/lib/dashboard/use-analytics";
import { FunnelEditor } from "@/components/dashboard/funnels/funnel-editor";
import { EmptyState, Sk } from "@/components/dashboard/states";

/** Loads a funnel definition for the edit route, then renders the editor. */
export function FunnelEditLoader({
  site,
  funnelId,
  stateless = false,
}: {
  site: string;
  funnelId: string;
  stateless?: boolean;
}) {
  const q = useFunnels(site);
  if (q.isPending) return <Sk className="h-96 w-full rounded-2xl" />;
  const funnel = (q.data ?? []).find((f) => f.id === funnelId);
  if (!funnel) return <EmptyState title="Funnel not found" hint="It may have been archived." />;
  return <FunnelEditor site={site} funnel={funnel} stateless={stateless} />;
}
