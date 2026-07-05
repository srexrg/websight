"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { sankey, sankeyJustify, sankeyLinkHorizontal } from "d3-sankey";
import type { SankeyExtraProperties, SankeyNodeMinimal, SankeyLinkMinimal } from "d3-sankey";
import type { JourneyResult } from "@/lib/analytics/journeys";
import { formatNumber } from "@/lib/dashboard/format";

type NodeExtra = { key: string; label: string; col: number; isOther: boolean; ended: number };
type LinkExtra = { pct: number };
type SNode = SankeyNodeMinimal<NodeExtra, LinkExtra> & NodeExtra;
type SLink = SankeyLinkMinimal<NodeExtra, LinkExtra> & LinkExtra;

const MARGIN = 118; // room for the outer-column labels
const NODE_W = 13;

function shortLabel(path: string, max = 20): string {
  if (path.length <= max) return path;
  return `${path.slice(0, max - 9)}…${path.slice(-8)}`;
}

export type SankeyNodeClick = { path: string; col: number; isOther: boolean };

/** Clean custom-SVG Sankey for user journeys (docs/redesign/10). */
export function JourneySankey({
  data,
  flip = false,
  onNodeClick,
}: {
  data: JourneyResult;
  flip?: boolean;
  onNodeClick?: (node: SankeyNodeClick, clientX: number, clientY: number) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(920);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width;
      if (w > 0) setWidth(Math.max(560, Math.floor(w)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const maxCol = data.nodes.reduce((m, n) => Math.max(m, n.col), 0);
  const perCol = new Map<number, number>();
  for (const n of data.nodes) perCol.set(n.col, (perCol.get(n.col) ?? 0) + 1);
  const densest = Math.max(...perCol.values(), 1);
  const height = Math.max(360, Math.min(densest * 46 + 40, 660));

  const graph = useMemo(() => {
    const index = new Map<string, number>();
    const nodes: (NodeExtra & SankeyExtraProperties)[] = [];
    for (const n of data.nodes) {
      index.set(n.id, nodes.length);
      nodes.push({ key: n.id, label: n.path, col: n.col, isOther: n.isOther, ended: n.ended });
    }
    const sourceTotal = new Map<string, number>();
    for (const e of data.edges) sourceTotal.set(e.source, (sourceTotal.get(e.source) ?? 0) + e.count);
    const links: { source: number; target: number; value: number; pct: number }[] = [];
    for (const e of data.edges) {
      const s = index.get(e.source);
      const t = index.get(e.target);
      if (s == null || t == null) continue;
      links.push({ source: s, target: t, value: e.count, pct: e.count / (sourceTotal.get(e.source) ?? e.count) });
    }
    if (nodes.length === 0 || links.length === 0) return null;
    try {
      const laid = sankey<NodeExtra, LinkExtra>()
        .nodeWidth(NODE_W)
        .nodePadding(14)
        .nodeAlign(sankeyJustify)
        .extent([[MARGIN, 24], [width - MARGIN, height - 12]])({
        nodes: nodes.map((n) => ({ ...n })),
        links: links.map((l) => ({ ...l })),
      });
      if (flip) {
        for (const n of laid.nodes) {
          const nx0 = width - (n.x1 ?? 0);
          const nx1 = width - (n.x0 ?? 0);
          n.x0 = nx0;
          n.x1 = nx1;
        }
      }
      return laid;
    } catch {
      return null;
    }
  }, [data, width, height, flip]);

  if (!graph) {
    return (
      <div ref={wrapRef} className="flex h-40 items-center justify-center text-[13px] text-muted-foreground">
        Not enough path data to draw a journey.
      </div>
    );
  }

  const linkPath = sankeyLinkHorizontal<NodeExtra, LinkExtra>();
  const lastCol = flip ? 0 : maxCol;
  const firstCol = flip ? maxCol : 0;

  const connected = (l: SLink) =>
    hover != null && ((l.source as SNode).key === hover || (l.target as SNode).key === hover);

  return (
    <div ref={wrapRef} className="w-full overflow-x-auto">
      <svg width={width} height={height} className="min-w-[600px]" style={{ fontFamily: "var(--font-jetbrains), monospace" }}>
        <g strokeLinecap="round">
          {(graph.links as SLink[]).map((l, i) => {
            const on = connected(l);
            return (
              <path
                key={i}
                d={linkPath(l) ?? undefined}
                fill="none"
                stroke="var(--brand)"
                strokeOpacity={hover == null ? 0.16 : on ? 0.5 : 0.05}
                strokeWidth={Math.max(1, l.width ?? 1)}
                style={{ transition: "stroke-opacity 140ms ease-out" }}
              >
                <title>{`${(l.source as SNode).label} → ${(l.target as SNode).label}: ${formatNumber(l.value ?? 0)} (${Math.round(l.pct * 100)}% of ${(l.source as SNode).label})`}</title>
              </path>
            );
          })}
        </g>
        <g>
          {(graph.nodes as SNode[]).map((n, i) => {
            const x0 = n.x0 ?? 0;
            const x1 = n.x1 ?? 0;
            const y0 = n.y0 ?? 0;
            const h = Math.max(2, (n.y1 ?? 0) - y0);
            const active = hover == null || hover === n.key;
            const isFirst = n.col === firstCol;
            const isLast = n.col === lastCol;
            // Label placement: first col outside-left, last col outside-right, middle above.
            const pos = isFirst
              ? { x: x0 - 7, y: y0 + h / 2, anchor: "end" as const, dy: "0.34em", above: false }
              : isLast
                ? { x: x1 + 7, y: y0 + h / 2, anchor: "start" as const, dy: "0.34em", above: false }
                : { x: (x0 + x1) / 2, y: y0 - 5, anchor: "middle" as const, dy: "0", above: true };
            return (
              <g
                key={i}
                onMouseEnter={() => setHover(n.key)}
                onMouseLeave={() => setHover(null)}
                style={{ opacity: active ? 1 : 0.4, transition: "opacity 140ms ease-out" }}
              >
                <rect
                  x={x0}
                  y={y0}
                  width={x1 - x0}
                  height={h}
                  rx={2.5}
                  fill={n.isOther ? "var(--muted-foreground)" : "var(--brand)"}
                  fillOpacity={n.isOther ? 0.45 : 0.9}
                  className={n.isOther ? "cursor-default" : "cursor-pointer"}
                  onClick={(ev) =>
                    !n.isOther && onNodeClick?.({ path: n.label, col: n.col, isOther: n.isOther }, ev.clientX, ev.clientY)
                  }
                >
                  <title>{`${n.label}: ${formatNumber(n.value ?? 0)}${n.ended > 0 ? ` · ${formatNumber(n.ended)} exited here` : ""}`}</title>
                </rect>
                {(pos.above ? h > 6 : true) && (
                  <text
                    x={pos.x}
                    y={pos.y}
                    dy={pos.dy}
                    textAnchor={pos.anchor}
                    className="pointer-events-none fill-foreground"
                    style={{ fontSize: pos.above ? 10 : 11 }}
                  >
                    {shortLabel(n.label, pos.above ? 16 : 20)}
                    <tspan className="fill-muted-foreground"> {formatNumber(n.value ?? 0)}</tspan>
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
