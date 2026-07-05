"use client";

import { BreakdownCard } from "@/components/dashboard/breakdown-card";
import type { BreakdownDimension } from "@/lib/analytics/queries";
import { useBreakdown, useDashboardParams, useFilters } from "@/lib/dashboard/use-analytics";
import { countryItems, toItems } from "./shared";

export function AudienceScreen({ site }: { site: string }) {
  const { params } = useDashboardParams();
  const { filters, add } = useFilters();
  const countries = useBreakdown(site, params, "country", 20);
  const devices = useBreakdown(site, params, "device_type", 10);
  const browsers = useBreakdown(site, params, "browser", 10);
  const os = useBreakdown(site, params, "os", 10);
  const langs = useBreakdown(site, params, "lang", 10);

  const cardProps = (q: typeof countries, dim: BreakdownDimension) => ({
    isLoading: q.isPending,
    isError: q.isError,
    onRowClick: (v: string) => add(dim, v),
    activeValues: filters.filter((f) => f.dim === dim && f.op === "is").flatMap((f) => f.values),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownCard title="Countries" items={countryItems(countries.data)} {...cardProps(countries, "country")} />
        <BreakdownCard title="Devices" items={toItems(devices.data)} {...cardProps(devices, "device_type")} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <BreakdownCard title="Browsers" items={toItems(browsers.data)} {...cardProps(browsers, "browser")} />
        <BreakdownCard title="Operating Systems" items={toItems(os.data)} {...cardProps(os, "os")} />
        <BreakdownCard title="Languages" items={toItems(langs.data)} {...cardProps(langs, "lang")} />
      </div>
    </div>
  );
}
