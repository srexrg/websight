"use client";

import { BreakdownCard } from "@/components/dashboard/breakdown-card";
import type { BreakdownDimension } from "@/lib/analytics/queries";
import { useBreakdown, useDashboardParams, useFilters } from "@/lib/dashboard/use-analytics";
import { toItems } from "./shared";

export function SourcesScreen({ site }: { site: string }) {
  const { params } = useDashboardParams();
  const { filters, add } = useFilters();
  const channels = useBreakdown(site, params, "channel", 10);
  const referrers = useBreakdown(site, params, "referrer_domain", 20);
  const utmSources = useBreakdown(site, params, "utm_source", 20);
  const campaigns = useBreakdown(site, params, "utm_campaign", 20);

  const cardProps = (q: typeof channels, dim: BreakdownDimension) => ({
    items: toItems(q.data),
    isLoading: q.isPending,
    isError: q.isError,
    onRowClick: (v: string) => add(dim, v),
    activeValues: filters.filter((f) => f.dim === dim && f.op === "is").flatMap((f) => f.values),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownCard
          title="Channels"
          {...cardProps(channels, "channel")}
          emptyHint="Search, Social, Email, Paid, Referral and Direct - classified automatically."
        />
        <BreakdownCard
          title="Referrers"
          {...cardProps(referrers, "referrer_domain")}
          emptyHint="External sites that linked to you appear here."
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownCard
          title="UTM Sources"
          {...cardProps(utmSources, "utm_source")}
          emptyHint="Tag campaign links with ?utm_source=... to see them here."
        />
        <BreakdownCard
          title="UTM Campaigns"
          {...cardProps(campaigns, "utm_campaign")}
          emptyHint="Tag campaign links with ?utm_campaign=... to see them here."
        />
      </div>
    </div>
  );
}
