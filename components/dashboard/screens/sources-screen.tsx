"use client";

import { useQueryState } from "nuqs";
import { BreakdownCard } from "@/components/dashboard/breakdown-card";
import { rangeParser } from "@/lib/dashboard/range";
import { useBreakdown } from "@/lib/dashboard/use-analytics";
import { toItems } from "./shared";

export function SourcesScreen({ site }: { site: string }) {
  const [range] = useQueryState("range", rangeParser);
  const channels = useBreakdown(site, range, "channel", 10);
  const referrers = useBreakdown(site, range, "referrer_domain", 20);
  const utmSources = useBreakdown(site, range, "utm_source", 20);
  const campaigns = useBreakdown(site, range, "utm_campaign", 20);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownCard
          title="Channels"
          items={toItems(channels.data)}
          isLoading={channels.isPending}
          isError={channels.isError}
          emptyHint="Search, Social, Email, Paid, Referral and Direct - classified automatically."
        />
        <BreakdownCard
          title="Referrers"
          items={toItems(referrers.data)}
          isLoading={referrers.isPending}
          isError={referrers.isError}
          emptyHint="External sites that linked to you appear here."
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownCard
          title="UTM Sources"
          items={toItems(utmSources.data)}
          isLoading={utmSources.isPending}
          isError={utmSources.isError}
          emptyHint="Tag campaign links with ?utm_source=... to see them here."
        />
        <BreakdownCard
          title="UTM Campaigns"
          items={toItems(campaigns.data)}
          isLoading={campaigns.isPending}
          isError={campaigns.isError}
          emptyHint="Tag campaign links with ?utm_campaign=... to see them here."
        />
      </div>
    </div>
  );
}
