"use client";

import { useState } from "react";
import { useQueryState } from "nuqs";
import { DashboardProviders } from "@/components/dashboard/providers";
import { ShareContext } from "@/lib/dashboard/share-context";
import { rangeParser, RANGE_PRESETS, type RangePreset } from "@/lib/dashboard/range";
import { PoweredBadge } from "@/components/share/powered-badge";
import { OverviewScreen } from "@/components/dashboard/screens/overview-screen";
import { PagesScreen } from "@/components/dashboard/screens/pages-screen";
import { SourcesScreen } from "@/components/dashboard/screens/sources-screen";
import { AudienceScreen } from "@/components/dashboard/screens/audience-screen";
import { RealtimeScreen } from "@/components/dashboard/screens/realtime-screen";
import { GlobeScreen } from "@/components/dashboard/screens/globe-screen";

const SCREENS: Record<string, { label: string; Component: (p: { site: string }) => React.ReactNode }> = {
  overview: { label: "Overview", Component: OverviewScreen },
  realtime: { label: "Realtime", Component: RealtimeScreen },
  globe: { label: "Globe", Component: GlobeScreen },
  pages: { label: "Pages", Component: PagesScreen },
  sources: { label: "Sources", Component: SourcesScreen },
  audience: { label: "Audience", Component: AudienceScreen },
};
const ORDER = ["overview", "realtime", "globe", "pages", "sources", "audience"];

function RangeTabs() {
  const [range, setRange] = useQueryState("range", rangeParser);
  return (
    <div className="flex rounded-lg border border-border p-0.5">
      {RANGE_PRESETS.map((r) => (
        <button
          key={r}
          onClick={() => setRange(r as RangePreset)}
          className={`rounded-md px-2.5 py-1 font-mono text-[11.5px] font-semibold transition-colors ${
            range === r ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

function Shell({
  publicId,
  siteName,
  domain,
  exposedScreens,
}: {
  publicId: string;
  siteName: string;
  domain: string | null;
  exposedScreens: string[];
}) {
  const tabs = ORDER.filter((s) => exposedScreens.includes(s) && SCREENS[s]);
  const [active, setActive] = useState(tabs[0] ?? "overview");
  const Active = SCREENS[active]?.Component ?? OverviewScreen;
  const favicon = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null;

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-5 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {favicon && <img src={favicon} alt="" width={22} height={22} className="rounded" />}
          <h1 className="text-[17px] font-semibold text-foreground">{siteName}</h1>
        </div>
        <RangeTabs />
      </header>

      {tabs.length > 1 && (
        <nav className="mb-4 flex flex-wrap gap-1 border-b border-border">
          {tabs.map((s) => (
            <button
              key={s}
              onClick={() => setActive(s)}
              className={`-mb-px border-b-2 px-3 py-1.5 text-[13px] font-medium transition-colors ${
                active === s ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {SCREENS[s].label}
            </button>
          ))}
        </nav>
      )}

      <main className="flex-1">
        <Active site={publicId} />
      </main>
      <PoweredBadge />
    </div>
  );
}

export function PublicShell(props: {
  token: string;
  publicId: string;
  siteName: string;
  domain: string | null;
  exposedScreens: string[];
}) {
  return (
    <DashboardProviders>
      <ShareContext.Provider value={{ token: props.token, readOnly: true }}>
        <Shell
          publicId={props.publicId}
          siteName={props.siteName}
          domain={props.domain}
          exposedScreens={props.exposedScreens}
        />
      </ShareContext.Provider>
    </DashboardProviders>
  );
}
