"use client";

import { useQueryState } from "nuqs";
import { BreakdownCard } from "@/components/dashboard/breakdown-card";
import { rangeParser } from "@/lib/dashboard/range";
import { useBreakdown } from "@/lib/dashboard/use-analytics";
import { countryItems, toItems } from "./shared";

export function AudienceScreen({ site }: { site: string }) {
  const [range] = useQueryState("range", rangeParser);
  const countries = useBreakdown(site, range, "country", 20);
  const devices = useBreakdown(site, range, "device_type", 10);
  const browsers = useBreakdown(site, range, "browser", 10);
  const os = useBreakdown(site, range, "os", 10);
  const langs = useBreakdown(site, range, "lang", 10);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownCard
          title="Countries"
          items={countryItems(countries.data)}
          isLoading={countries.isPending}
          isError={countries.isError}
        />
        <BreakdownCard
          title="Devices"
          items={toItems(devices.data)}
          isLoading={devices.isPending}
          isError={devices.isError}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <BreakdownCard
          title="Browsers"
          items={toItems(browsers.data)}
          isLoading={browsers.isPending}
          isError={browsers.isError}
        />
        <BreakdownCard
          title="Operating Systems"
          items={toItems(os.data)}
          isLoading={os.isPending}
          isError={os.isError}
        />
        <BreakdownCard
          title="Languages"
          items={toItems(langs.data)}
          isLoading={langs.isPending}
          isError={langs.isError}
        />
      </div>
    </div>
  );
}
