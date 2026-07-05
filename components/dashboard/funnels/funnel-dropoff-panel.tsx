"use client";

import Link from "next/link";
import type { FunnelVisitor } from "@/lib/analytics/queries";
import { useDashboardParams, useFunnelStepVisitors } from "@/lib/dashboard/use-analytics";
import { visitorCode, visitorColor } from "@/components/dashboard/sessions/session-row";
import { Sk } from "@/components/dashboard/states";

function VisitorList({
  site,
  visitors,
  isPending,
  empty,
}: {
  site: string;
  visitors?: FunnelVisitor[];
  isPending: boolean;
  empty: string;
}) {
  if (isPending) {
    return (
      <div className="space-y-1.5">
        {[0, 1, 2].map((i) => (
          <Sk key={i} className="h-5 w-full" />
        ))}
      </div>
    );
  }
  if (!visitors || visitors.length === 0) {
    return <p className="text-[12px] text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="space-y-1">
      {visitors.map((v) => {
        const key = v.userId ?? v.visitorId;
        const label = v.userId ?? `Visitor ${visitorCode(v.visitorId)}`;
        return (
          <li key={v.visitorId}>
            <Link
              href={`/${site}/profiles/${encodeURIComponent(key)}`}
              className="flex items-center gap-2 text-[12.5px] text-foreground hover:text-brand"
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: visitorColor(v.visitorId) }} />
              <span className="truncate">{label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Converted / dropped visitor lists for one funnel step (docs/redesign/09 M3). */
export function FunnelDropoffPanel({
  site,
  funnelId,
  step,
}: {
  site: string;
  funnelId: string;
  step: number;
}) {
  const { params } = useDashboardParams();
  const converted = useFunnelStepVisitors(site, params, funnelId, step, "converted", true);
  const dropped = useFunnelStepVisitors(site, params, funnelId, step, "dropped", step >= 2);

  return (
    <div className="mt-2 grid gap-4 rounded-lg border border-border/70 bg-secondary/30 p-3 sm:grid-cols-2">
      {step >= 2 && (
        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-danger">
            Dropped before step {step}
          </div>
          <VisitorList site={site} visitors={dropped.data} isPending={dropped.isPending} empty="No one dropped here." />
        </div>
      )}
      <div>
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Reached step {step}
        </div>
        <VisitorList site={site} visitors={converted.data} isPending={converted.isPending} empty="No one reached this step." />
      </div>
    </div>
  );
}
