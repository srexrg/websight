"use client";

import Link from "next/link";
import type { AnalyticsParams } from "@/lib/dashboard/use-analytics";
import { useRetentionVisitors } from "@/lib/dashboard/use-analytics";
import type { RetentionInterval, RetentionParams } from "@/lib/analytics/retention";
import { Sk } from "@/components/dashboard/states";
import { visitorCode, visitorColor } from "@/components/dashboard/sessions/session-row";

const UNIT: Record<RetentionInterval, string> = { day: "day", week: "week", month: "month" };

/**
 * Cell drill-down (docs/redesign/11 M4): the identities from one cohort who
 * returned in one period, each linking to their profile (which lists sessions).
 */
export function CellDrilldown({
  site,
  params,
  rp,
  cohort,
  active,
  period,
  onClose,
}: {
  site: string;
  params: AnalyticsParams;
  rp: RetentionParams;
  cohort: string;
  active: string;
  period: number;
  onClose: () => void;
}) {
  const q = useRetentionVisitors(site, params, rp, { cohort, active });

  return (
    <div className="mt-3 rounded-xl border border-border bg-secondary/40 p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[12.5px] font-semibold text-foreground">
          Retained{" "}
          <span className="font-mono text-muted-foreground">
            {UNIT[rp.interval]} +{period}
          </span>
        </h4>
        <button
          onClick={onClose}
          className="rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Close"
        >
          <span className="text-[15px] leading-none">&times;</span>
        </button>
      </div>

      {q.isPending ? (
        <div className="mt-2 space-y-1">
          <Sk className="h-6 w-full" />
          <Sk className="h-6 w-3/4" />
        </div>
      ) : q.isError ? (
        <p className="mt-2 text-[12px] text-danger">Could not load retained visitors.</p>
      ) : (q.data?.length ?? 0) === 0 ? (
        <p className="mt-2 text-[12px] text-muted-foreground">No visitors to show.</p>
      ) : (
        <ul className="mt-2 grid max-h-64 gap-0.5 overflow-y-auto sm:grid-cols-2">
          {q.data!.map((v) => (
            <li key={v.profileKey}>
              <Link
                href={`/${site}/profiles/${encodeURIComponent(v.profileKey)}`}
                className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-card"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: visitorColor(v.visitorId) }}
                  aria-hidden
                />
                <span className="truncate text-[12px] text-foreground">
                  {v.userId ?? `Visitor ${visitorCode(v.visitorId)}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
