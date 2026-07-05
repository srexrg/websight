"use client";

import { useMemo } from "react";
import { sankey, sankeyJustify, sankeyLinkHorizontal } from "d3-sankey";
import type { SankeyExtraProperties, SankeyNodeMinimal, SankeyLinkMinimal } from "d3-sankey";
import type { JourneyResult } from "@/lib/analytics/journeys";
import { formatNumber } from "@/lib/dashboard/format";

type NodeExtra = { key: string; label: string; col: number; isOther: boolean; isDrop: boolean };
type LinkExtra = { pct: number };
type SNode = SankeyNodeMinimal<NodeExtra, LinkExtra> & NodeExtra;
type SLink = SankeyLinkMinimal<NodeExtra, LinkExtra> & LinkExtra;

function shortLabel(path: string): string {
  if (path.length <= 22) return path;
  return `${path.slice(0, 12)}…${path.slice(-8)}`;
}

/** Custom-SVG Sankey for user journeys (docs/redesign/10 M2). */
export type SankeyNodeClick = { path: string; col: number; isOther: boolean };

export function JourneySankey({
  data,
  width = 940,
  height = 460,
  flip = false,
  onNodeClick,
}: {
  data: JourneyResult;
  width?: number;
  height?: number;
  /** Mirror horizontally so the anchor sits on the right (ends-with mode). */
  flip?: boolean;
  onNodeClick?: (node: SankeyNodeClick, clientX: number, clientY: number) => void;
}) {
  const graph = useMemo(() => {
    const index = new Map<string, number>();
    const nodes: (NodeExtra & SankeyExtraProperties)[] = [];
    const push = (key: string, meta: NodeExtra) => {
      if (!index.has(key)) {
        index.set(key, nodes.length);
        nodes.push(meta);
      }
      return index.get(key)!;
    };

    for (const n of data.nodes) {
      push(n.id, { key: n.id, label: n.path, col: n.col, isOther: n.isOther, isDrop: false });
    }
    const links: { source: number; target: number; value: number; pct: number }[] = [];
    const sourceTotal = new Map<string, number>();
    for (const e of data.edges) sourceTotal.set(e.source, (sourceTotal.get(e.source) ?? 0) + e.count);
    for (const e of data.edges) {
      const s = index.get(e.source);
      const t = index.get(e.target);
      if (s == null || t == null) continue;
      links.push({ source: s, target: t, value: e.count, pct: e.count / (sourceTotal.get(e.source) ?? e.count) });
    }
    // Drop-off sinks (sessions that ended at a node).
    for (const n of data.nodes) {
      if (n.ended <= 0) continue;
      const sinkKey = `drop:${n.col}`;
      const sinkIdx = push(sinkKey, { key: sinkKey, label: "Exited", col: n.col + 1, isOther: false, isDrop: true });
      const total = n.count || n.ended;
      links.push({ source: index.get(n.id)!, target: sinkIdx, value: n.ended, pct: n.ended / total });
    }

    if (nodes.length === 0 || links.length === 0) return null;
    try {
      const laid = sankey<NodeExtra, LinkExtra>()
        .nodeWidth(11)
        .nodePadding(9)
        .nodeAlign(sankeyJustify)
        .extent([[1, 6], [width - 1, height - 6]])({
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
      <div className="flex h-40 items-center justify-center text-[13px] text-muted-foreground">
        Not enough path data to draw a journey.
      </div>
    );
  }

  const linkPath = sankeyLinkHorizontal<NodeExtra, LinkExtra>();

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="min-w-[640px]">
        <g>
          {(graph.links as SLink[]).map((l, i) => {
            const src = l.source as SNode;
            const tgt = l.target as SNode;
            return (
              <path
                key={i}
                d={linkPath(l) ?? undefined}
                fill="none"
                stroke={tgt.isDrop ? "var(--danger)" : "var(--brand)"}
                strokeOpacity={tgt.isDrop ? 0.18 : 0.22}
                strokeWidth={Math.max(1, l.width ?? 1)}
              >
                <title>
                  {`${src.label} → ${tgt.isDrop ? "Exit" : tgt.label}: ${formatNumber(l.value ?? 0)} (${(l.pct * 100).toFixed(0)}% of ${src.label})`}
                </title>
              </path>
            );
          })}
        </g>
        <g>
          {(graph.nodes as SNode[]).map((n, i) => {
            const x0 = n.x0 ?? 0;
            const y0 = n.y0 ?? 0;
            const w = (n.x1 ?? 0) - x0;
            const h = Math.max(1, (n.y1 ?? 0) - y0);
            const labelRight = x0 < width / 2;
            return (
              <g key={i}>
                <rect
                  x={x0}
                  y={y0}
                  width={w}
                  height={h}
                  rx={1.5}
                  fill={n.isDrop ? "var(--danger)" : n.isOther ? "var(--muted-foreground)" : "var(--brand)"}
                  fillOpacity={n.isDrop ? 0.5 : n.isOther ? 0.5 : 0.85}
                  className={n.isDrop ? "" : "cursor-pointer"}
                  onClick={(ev) =>
                    !n.isDrop && onNodeClick?.({ path: n.label, col: n.col, isOther: n.isOther }, ev.clientX, ev.clientY)
                  }
                >
                  <title>{`${n.label}: ${formatNumber(n.value ?? 0)}`}</title>
                </rect>
                {h > 10 && (
                  <text
                    x={labelRight ? (n.x1 ?? 0) + 4 : x0 - 4}
                    y={y0 + h / 2}
                    dy="0.35em"
                    textAnchor={labelRight ? "start" : "end"}
                    className="fill-foreground font-mono"
                    style={{ fontSize: 10.5 }}
                  >
                    {shortLabel(n.label)}
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
