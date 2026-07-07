"use client";

import { useMemo } from "react";
import type { VitalMetric, VitalTimeseriesPoint } from "@/lib/analytics/vitals";
import { VITAL_META, formatVital, ratingOf } from "@/lib/analytics/vitals";
import { RATING_COLOR } from "./metric-cards";

/** Compact p75-over-time line for the selected metric, with good/poor threshold bands. */
export function VitalsTimeseries({ data, metric }: { data: VitalTimeseriesPoint[] | undefined; metric: VitalMetric }) {
  const W = 900;
  const H = 200;
  const PAD = { l: 44, r: 12, t: 12, b: 22 };
  const meta = VITAL_META[metric];

  const pts = useMemo(() => (data ?? []).filter((d) => d.p75 != null) as Required<VitalTimeseriesPoint>[], [data]);

  if (pts.length === 0) {
    return <div className="flex h-44 items-center justify-center text-[12.5px] text-muted-foreground">No samples in range.</div>;
  }

  const maxV = Math.max(meta.poor * 1.1, ...pts.map((p) => p.p75!));
  const px = (i: number) => PAD.l + (pts.length === 1 ? 0.5 : i / (pts.length - 1)) * (W - PAD.l - PAD.r);
  const py = (v: number) => PAD.t + (1 - v / maxV) * (H - PAD.t - PAD.b);

  return (
    <div className="w-full overflow-x-auto">
      <svg width={W} height={H} className="min-w-[560px]" style={{ fontFamily: "var(--font-jetbrains), monospace" }}>
        {/* Good / poor threshold bands */}
        <rect x={PAD.l} y={py(meta.good)} width={W - PAD.l - PAD.r} height={Math.max(0, py(0) - py(meta.good))} fill="var(--success)" opacity={0.06} />
        <rect x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={Math.max(0, py(meta.poor) - PAD.t)} fill="var(--danger)" opacity={0.06} />
        {[meta.good, meta.poor].map((th, i) => (
          <g key={i}>
            <line x1={PAD.l} x2={W - PAD.r} y1={py(th)} y2={py(th)} stroke={i === 0 ? "var(--success)" : "var(--danger)"} strokeDasharray="3 3" strokeWidth={1} opacity={0.5} />
            <text x={PAD.l - 6} y={py(th)} dy="0.32em" textAnchor="end" className="fill-muted-foreground" style={{ fontSize: 9 }}>
              {formatVital(metric, th)}
            </text>
          </g>
        ))}
        {/* p75 line */}
        <path
          d={pts.map((p, i) => `${i === 0 ? "M" : "L"}${px(i)},${py(p.p75!)}`).join(" ")}
          fill="none"
          stroke="var(--brand)"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {pts.map((p, i) => (
          <circle key={i} cx={px(i)} cy={py(p.p75!)} r={2.5} fill={RATING_COLOR[ratingOf(metric, p.p75)!]}>
            <title>{`${p.bucket.slice(0, 10)}: ${formatVital(metric, p.p75)} (${p.sample} samples)`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}
