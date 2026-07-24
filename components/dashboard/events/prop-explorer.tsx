"use client";

import { useState } from "react";
import type { AnalyticsParams } from "@/lib/dashboard/use-analytics";
import { useEventPropKeys, useEventPropValues, useFilters } from "@/lib/dashboard/use-analytics";
import { RowsSkeleton } from "@/components/dashboard/states";
import { formatNumber } from "@/lib/dashboard/format";

/**
 * Property explorer (docs/redesign/14 M3): list the prop keys seen for an event,
 * click one to see its top values with counts. Values are click-to-filter
 * (adds a prop:<key> filter). Keys not in the dictionary's expected list get a
 * soft "unexpected" nudge; high-cardinality keys show a completeness caveat.
 */
export function PropExplorer({
  site,
  params,
  name,
  expectedProps,
}: {
  site: string;
  params: AnalyticsParams;
  name: string;
  expectedProps: string[];
}) {
  const keysQ = useEventPropKeys(site, params, name);
  const [key, setKey] = useState<string | null>(null);
  const { add } = useFilters();

  const keys = keysQ.data ?? [];
  // The first key is pre-selected in the UI, so the values query has to follow
  // that same fallback - querying on `key` alone leaves it disabled (and so
  // stuck rendering its skeleton) until the visitor clicks a key.
  const activeKey = key ?? keys[0]?.key ?? null;
  const valuesQ = useEventPropValues(site, params, name, activeKey);
  const values = valuesQ.data ?? [];
  const total = values.reduce((s, v) => s + v.count, 0) || 1;
  const distinct = values[0]?.totalDistinct ?? 0;
  const highCard = distinct > values.length;

  if (keysQ.isPending) return <RowsSkeleton rows={4} />;
  if (keys.length === 0) return <p className="py-2 text-[12px] text-muted-foreground">This event carries no properties.</p>;

  return (
    <div className="grid gap-3 md:grid-cols-[200px_1fr]">
      {/* Prop keys */}
      <ul className="flex flex-wrap gap-1.5 md:flex-col md:gap-0.5">
        {keys.map((k) => {
          const unexpected = expectedProps.length > 0 && !expectedProps.includes(k.key);
          const on = (activeKey ?? "") === k.key;
          return (
            <li key={k.key}>
              <button
                onClick={() => setKey(k.key)}
                className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-[12px] transition-colors ${
                  on ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-1.5 font-mono">
                  {k.key}
                  {unexpected && <span className="text-[10px] text-[#D9A441]" title="Not in expected props">•</span>}
                </span>
                <span className="font-mono text-[10.5px] text-muted-foreground/70">{formatNumber(k.count)}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Values for the active key */}
      <div>
        {valuesQ.isPending ? (
          <RowsSkeleton rows={5} />
        ) : values.length === 0 ? (
          <p className="py-2 text-[12px] text-muted-foreground">No values.</p>
        ) : (
          <>
            <ul className="space-y-1">
              {values.map((v) => (
                <li key={v.value} className="relative">
                  <button
                    onClick={() => activeKey && add(`prop:${activeKey}`, v.value)}
                    className="relative z-10 flex w-full items-center justify-between gap-3 rounded px-1.5 py-1 text-[12px] hover:bg-secondary/40"
                    title="Filter the dashboard to this value"
                  >
                    <span className="min-w-0 flex-1 truncate text-left font-mono text-foreground">{v.value}</span>
                    <span className="shrink-0 font-mono text-muted-foreground">
                      {formatNumber(v.count)} · {Math.round((v.count / total) * 100)}%
                    </span>
                  </button>
                  <span className="absolute inset-y-0 left-0 z-0 rounded bg-secondary/60" style={{ width: `${(v.count / total) * 100}%` }} />
                </li>
              ))}
            </ul>
            {highCard && (
              <p className="mt-2 text-[11px] text-muted-foreground/70">
                High cardinality: {formatNumber(distinct)} distinct values, showing the top {values.length}.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
