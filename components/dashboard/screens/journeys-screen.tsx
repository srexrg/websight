"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { JourneyDirection } from "@/lib/analytics/journeys";
import { encodeFilters } from "@/lib/analytics/filters";
import { useDashboardParams, useFilters, useJourneys } from "@/lib/dashboard/use-analytics";
import { JourneySankey, type SankeyNodeClick } from "@/components/dashboard/journeys/sankey";
import { EmptyState, ErrorState, Sk } from "@/components/dashboard/states";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumber } from "@/lib/dashboard/format";

const SELECT = "h-auto w-auto rounded-md px-2 py-1 text-[12.5px] shadow-none";

/** Resolve CSS custom properties to concrete colors so the exported PNG keeps them. */
function inlineColors(svg: SVGSVGElement): string {
  const cs = getComputedStyle(document.documentElement);
  const vars = ["--brand", "--danger", "--muted-foreground", "--foreground", "--card"];
  let s = new XMLSerializer().serializeToString(svg);
  for (const v of vars) s = s.replaceAll(`var(${v})`, cs.getPropertyValue(v).trim() || "#0E9C6E");
  const bg = cs.getPropertyValue("--card").trim() || "#101512";
  return s.replace(
    /<svg([^>]*)>/,
    `<svg$1><rect width="100%" height="100%" fill="${bg}"/>`,
  );
}

export function JourneysScreen({ site }: { site: string }) {
  const { params } = useDashboardParams();
  const { add } = useFilters();
  const router = useRouter();
  const [direction, setDirection] = useState<JourneyDirection>("starts");
  const [steps, setSteps] = useState(4);
  const [topN, setTopN] = useState(8);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [grouping, setGrouping] = useState<string[]>([]);
  const [groupInput, setGroupInput] = useState("");
  const [menu, setMenu] = useState<{ node: SankeyNodeClick; x: number; y: number } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const q = useJourneys(site, params, { anchor, direction, steps, topN, grouping });

  function exportPng() {
    const svg = chartRef.current?.querySelector("svg");
    if (!svg) return;
    const xml = inlineColors(svg as SVGSVGElement);
    const url = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(xml)));
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = (svg as SVGSVGElement).width.baseVal.value * scale;
      canvas.height = (svg as SVGSVGElement).height.baseVal.value * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `journeys-${site}.png`;
      a.click();
    };
    img.src = url;
  }

  const anchorLabel = anchor ? `${direction === "ends" ? "Ending at" : "Starting at"} ${anchor}` : null;

  return (
    <section className="relative flex flex-col rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <header className="flex flex-wrap items-center justify-between gap-3 px-[18px] pb-2 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[14.5px] font-semibold text-foreground">User journeys</h3>
          {q.data && (
            <span className="font-mono text-[11.5px] text-muted-foreground">
              {formatNumber(q.data.sessions)} journeys{q.data.sampled ? " · sampled" : ""}
            </span>
          )}
          {anchorLabel && (
            <button
              onClick={() => setAnchor(null)}
              className="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 font-mono text-[11px] text-accent-foreground hover:opacity-80"
            >
              {anchorLabel} <span className="text-[13px] leading-none">&times;</span>
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md bg-secondary p-0.5">
            {(["starts", "ends"] as JourneyDirection[]).map((d) => (
              <button
                key={d}
                onClick={() => setDirection(d)}
                className={`rounded px-2 py-0.5 font-mono text-[11px] font-semibold transition-colors ${
                  direction === d ? "bg-card text-foreground shadow-[0_1px_2px_rgba(16,24,40,.06)]" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {d === "starts" ? "Starts" : "Ends"}
              </button>
            ))}
          </div>
          <Select value={String(steps)} onValueChange={(v) => setSteps(Number(v))}>
            <SelectTrigger className={SELECT}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2, 3, 4, 5, 6].map((s) => (
                <SelectItem key={s} value={String(s)} className="text-[12.5px]">
                  {s} steps
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(topN)} onValueChange={(v) => setTopN(Number(v))}>
            <SelectTrigger className={SELECT}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 8, 12].map((n) => (
                <SelectItem key={n} value={String(n)} className="text-[12.5px]">
                  top {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            onClick={exportPng}
            className="rounded-md border border-border px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title="Export the diagram as a PNG"
          >
            Export
          </button>
        </div>
      </header>

      {/* Grouping rules */}
      <div className="flex flex-wrap items-center gap-1.5 px-[18px] pb-1.5">
        <span className="text-[11px] text-muted-foreground">Collapse</span>
        {grouping.map((g) => (
          <span key={g} className="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 font-mono text-[11px] text-accent-foreground">
            {g}
            <button onClick={() => setGrouping((r) => r.filter((x) => x !== g))} className="hover:text-destructive">&times;</button>
          </span>
        ))}
        <input
          value={groupInput}
          onChange={(e) => setGroupInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && groupInput.trim()) {
              setGrouping((r) => Array.from(new Set([...r, groupInput.trim()])).slice(0, 20));
              setGroupInput("");
            }
          }}
          placeholder="/blog/* ↵"
          className="w-40 rounded-md border border-input bg-transparent px-2 py-0.5 font-mono text-[11px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:w-56 focus:border-ring"
          style={{ transition: "width 160ms ease-out" }}
        />
      </div>

      <div className="px-4 pb-4">
        {q.isPending ? (
          <Sk className="h-[460px] w-full" />
        ) : q.isError ? (
          <ErrorState message="Could not load journeys." />
        ) : !q.data || q.data.sessions === 0 ? (
          <EmptyState title="No journeys yet" hint="Journeys appear once visitors browse multiple pages in a session." />
        ) : (
          <>
            {/* Sankey (desktop) */}
            <div ref={chartRef} className="hidden md:block">
              <JourneySankey
                data={q.data}
                flip={direction === "ends"}
                onNodeClick={(node, x, y) => !node.isOther && setMenu({ node, x, y })}
              />
            </div>
            {/* Top paths (mobile) */}
            <ol className="space-y-1.5 md:hidden">
              {q.data.topPaths.map((p, i) => (
                <li key={i} className="flex items-center justify-between gap-2 border-b border-border/60 py-1.5 last:border-0">
                  <span className="flex min-w-0 flex-wrap items-center gap-1 font-mono text-[11.5px] text-foreground">
                    {p.path.map((seg, j) => (
                      <span key={j}>
                        {seg}
                        {j < p.path.length - 1 && <span className="mx-0.5 text-muted-foreground">›</span>}
                      </span>
                    ))}
                  </span>
                  <span className="shrink-0 font-mono text-[12px] text-muted-foreground">{formatNumber(p.count)}</span>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>

      {/* Node context menu */}
      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
          <div
            className="fixed z-50 w-52 overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
            style={{ left: Math.min(menu.x, window.innerWidth - 220), top: Math.min(menu.y, window.innerHeight - 180) }}
          >
            <div className="truncate border-b border-border/60 px-3 py-1.5 font-mono text-[11px] text-muted-foreground">{menu.node.path}</div>
            {[
              { label: "Set as start", fn: () => { setAnchor(menu.node.path); setDirection("starts"); } },
              { label: "Set as end", fn: () => { setAnchor(menu.node.path); setDirection("ends"); } },
              { label: "Filter dashboard to this page", fn: () => add("path", menu.node.path) },
              { label: "View sessions", fn: () => router.push(`/${site}/sessions?f=${encodeURIComponent(encodeFilters([{ dim: "path", op: "is", values: [menu.node.path] }]))}`) },
            ].map((a) => (
              <button
                key={a.label}
                onClick={() => { a.fn(); setMenu(null); }}
                className="block w-full px-3 py-1.5 text-left text-[12.5px] text-foreground hover:bg-secondary"
              >
                {a.label}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
