"use client";

import { useState } from "react";
import { BreakdownCard } from "@/components/dashboard/breakdown-card";
import type { BreakdownDimension } from "@/lib/analytics/queries";
import { useBreakdown, useDashboardParams, useFilters } from "@/lib/dashboard/use-analytics";
import { toItems } from "./shared";

const TABS = [
  { key: "path", label: "Top" },
  { key: "entry_path", label: "Entry" },
  { key: "exit_path", label: "Exit" },
];

export function PagesScreen({ site }: { site: string }) {
  const { params } = useDashboardParams();
  const { filters, add } = useFilters();
  const [tab, setTab] = useState("path");
  const pages = useBreakdown(site, params, tab as BreakdownDimension, 100);

  return (
    <BreakdownCard
      title="All Pages"
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
      items={toItems(pages.data, tab === "path")}
      isLoading={pages.isPending}
      isError={pages.isError}
      emptyTitle="No pageviews in this range"
      emptyHint="Install the tracking snippet and pages show up here in seconds."
      onRowClick={(v) => add(tab, v)}
      activeValues={filters.filter((f) => f.dim === tab && f.op === "is").flatMap((f) => f.values)}
    />
  );
}
