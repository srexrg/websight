"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { EmptyState, RowsSkeleton, Sk } from "@/components/dashboard/states";
import type { GlobeMarker } from "@/components/dashboard/globe/real-globe";
import { SessionDrawer } from "@/components/dashboard/sessions/session-drawer";
import type { SessionRow } from "@/lib/analytics/queries";
import { countryCoords, jitterAround } from "@/lib/dashboard/geo";
import {
  useBreakdown,
  useDashboardParams,
  useFilters,
  useLiveBreakdown,
  useLiveCount,
  useLiveSessions,
} from "@/lib/dashboard/use-analytics";
import { countryFlag, countryName } from "./shared";

// Aggregate (range) scatter caps so a busy globe stays readable.
const PER_COUNTRY = 4;
const TOTAL = 55;

// MapLibre needs window; load client-only (docs/redesign/06).
const RealGlobe = dynamic(
  () => import("@/components/dashboard/globe/real-globe").then((m) => m.RealGlobe),
  { ssr: false, loading: () => <Sk className="h-full w-full" /> },
);

const GEO_TABS = [
  { key: "country", label: "Countries" },
  { key: "region", label: "Regions" },
  { key: "city", label: "Cities" },
] as const;

export function GlobeScreen({ site }: { site: string }) {
  const { params } = useDashboardParams();
  const { encoded, add, filters } = useFilters();
  const [mode, setMode] = useState<"live" | "range">("live");
  const [tab, setTab] = useState<(typeof GEO_TABS)[number]["key"]>("country");

  const liveCount = useLiveCount(site, encoded);
  const liveSessions = useLiveSessions(site, mode === "live");
  const liveGeo = useLiveBreakdown(site, tab, encoded, 20);
  const rangeGeo = useBreakdown(site, params, tab, 20);
  const rangeCountries = useBreakdown(site, params, "country", 30);
  const [selected, setSelected] = useState<SessionRow | null>(null);

  const list =
    mode === "live"
      ? { rows: liveGeo.data?.map((r) => ({ value: r.value, count: r.visitors })), pending: liveGeo.isPending }
      : { rows: rangeGeo.data?.map((r) => ({ value: r.value, count: r.visitors })), pending: rangeGeo.isPending };

  // Live: one clickable avatar per active session, at real coords if known else
  // scattered around the country centroid, seeded by visitor id.
  const liveMarkers: GlobeMarker[] = useMemo(() => {
    const out: GlobeMarker[] = [];
    for (const s of liveSessions.data ?? []) {
      let lat = s.lat;
      let lng = s.lng;
      if (lat == null || lng == null) {
        const c = countryCoords(s.country);
        if (!c) continue;
        [lat, lng] = jitterAround(c[0], c[1], s.id, { spread: 3 });
      }
      const label = [s.city, s.country ? countryName(s.country) : null].filter(Boolean).join(", ");
      out.push({ id: s.id, seed: s.visitorId, label: label || "Unknown", lat, lng });
    }
    return out;
  }, [liveSessions.data]);

  // Range: country aggregates scattered into avatar slots (click filters country).
  const rangeMarkers: GlobeMarker[] = useMemo(() => {
    const rows = (rangeCountries.data ?? [])
      .map((r) => ({ code: r.value, count: r.visitors, coords: countryCoords(r.value) }))
      .filter((r): r is { code: string; count: number; coords: [number, number] } => r.coords !== null)
      .sort((a, b) => b.count - a.count);
    const out: GlobeMarker[] = [];
    for (const r of rows) {
      const n = Math.min(r.count, PER_COUNTRY);
      for (let i = 0; i < n && out.length < TOTAL; i++) {
        const [lat, lng] = jitterAround(r.coords[0], r.coords[1], `${r.code}-${i}`, { first: i === 0 });
        out.push({ id: `c:${r.code}:${i}`, seed: `${r.code}-${i}`, label: countryName(r.code), lat, lng });
      }
    }
    return out;
  }, [rangeCountries.data]);

  const markers = mode === "live" ? liveMarkers : rangeMarkers;

  function handleSelect(id: string) {
    if (id.startsWith("c:")) {
      add("country", id.split(":")[1]);
      return;
    }
    const s = liveSessions.data?.find((x) => x.id === id);
    if (s) setSelected(s);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      {/* Globe stage: real cartography on a space background */}
      <section className="relative min-h-[560px] overflow-hidden rounded-2xl border border-border bg-[radial-gradient(ellipse_at_center,#0b0d16_0%,#000000_75%)] shadow-[0_1px_2px_rgba(16,24,40,.04)]">
        <div className="ws-starfield" aria-hidden />
        <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 font-mono text-[11.5px] font-semibold text-[#EAF6EF] backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[#5FD3A6] [animation:wsBlink_1.4s_ease-in-out_infinite]" />
            {liveCount.data?.count ?? 0} online
          </span>
        </div>
        <div className="absolute right-4 top-4 z-10 flex rounded-lg bg-black/40 p-0.5 backdrop-blur">
          {(["live", "range"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-md px-2.5 py-1 font-mono text-[11.5px] font-semibold tracking-[.4px] transition-colors ${
                mode === m ? "bg-[#12291F] text-[#5FC2A0]" : "text-[#8FA89B] hover:text-[#EAF6EF]"
              }`}
            >
              {m === "live" ? "Live" : params.range}
            </button>
          ))}
        </div>
        <div className="absolute inset-0">
          <RealGlobe markers={markers} onSelect={handleSelect} />
        </div>
        {markers.length === 0 && !liveGeo.isPending && (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex justify-center">
            <span className="rounded-full bg-black/45 px-3 py-1.5 text-[12px] text-[#9AB5A8] backdrop-blur">
              {mode === "live"
                ? "No one online right now - the globe lights up when visitors arrive"
                : "No traffic in this range"}
            </span>
          </div>
        )}
      </section>

      {/* Geo drill-down panel */}
      <section className="flex flex-col rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]">
        <header className="flex items-center justify-between gap-2 px-[18px] pb-2 pt-4">
          <h3 className="text-[14.5px] font-semibold text-foreground">
            {mode === "live" ? "Live by location" : "Visitors by location"}
          </h3>
          <div className="flex rounded-md bg-secondary p-0.5">
            {GEO_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold tracking-[.4px] transition-colors ${
                  tab === t.key
                    ? "bg-card text-foreground shadow-[0_1px_2px_rgba(16,24,40,.06)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-[18px] pb-3">
          {list.pending ? (
            <RowsSkeleton rows={8} />
          ) : !list.rows || list.rows.length === 0 ? (
            <EmptyState
              title="No location data"
              hint={
                tab === "country"
                  ? "Geo comes from CDN headers - it appears on deployed traffic."
                  : "Region/city detail depends on CDN geo headers; country always works."
              }
            />
          ) : (
            <ul>
              {list.rows.map((r) => {
                const active = filters.some(
                  (f) => f.dim === tab && f.op === "is" && f.values.includes(r.value),
                );
                const max = Math.max(...list.rows!.map((x) => x.count), 1);
                return (
                  <li key={r.value} className="border-b border-border/60 last:border-b-0">
                    <button
                      onClick={() => add(tab, r.value)}
                      title="Click to filter"
                      className="relative flex w-full items-center gap-3 py-[7px] text-left"
                    >
                      <span className="relative flex min-w-0 flex-1 items-center">
                        <span
                          className={`absolute inset-y-0.5 left-0 rounded-[4px] ${active ? "bg-brand/25" : "bg-accent"}`}
                          style={{ width: `${Math.max((r.count / max) * 100, 2)}%` }}
                          aria-hidden
                        />
                        <span
                          className={`relative z-10 truncate px-1.5 text-[13px] ${
                            active ? "font-semibold text-accent-foreground" : "text-foreground"
                          }`}
                        >
                          {tab === "country"
                            ? `${countryFlag(r.value)} ${countryName(r.value)}`.trim()
                            : r.value}
                        </span>
                      </span>
                      <span className="w-10 shrink-0 text-right font-mono text-[13px] font-medium text-foreground">
                        {r.count}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <SessionDrawer site={site} session={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
