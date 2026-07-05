"use client";

import { useQueryState } from "nuqs";
import { BreakdownCard } from "@/components/dashboard/breakdown-card";
import { formatNumber } from "@/lib/dashboard/format";
import { rangeParser } from "@/lib/dashboard/range";
import { useBreakdown } from "@/lib/dashboard/use-analytics";

export function PagesScreen({ site }: { site: string }) {
  const [range] = useQueryState("range", rangeParser);
  const pages = useBreakdown(site, range, "path", 100);

  return (
    <BreakdownCard
      title="All Pages"
      items={pages.data?.map((r) => ({
        label: r.value,
        value: r.visitors,
        secondary: `${formatNumber(r.pageviews)} views`,
      }))}
      isLoading={pages.isPending}
      isError={pages.isError}
      emptyTitle="No pageviews in this range"
      emptyHint="Install the tracking snippet and pages show up here in seconds."
    />
  );
}
