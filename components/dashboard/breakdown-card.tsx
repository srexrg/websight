"use client";

import type { ReactNode } from "react";
import { formatNumber } from "@/lib/dashboard/format";
import { EmptyState, ErrorState, RowsSkeleton } from "./states";

export type BreakdownItem = {
  label: string;
  value: number;
  /** Optional secondary mono column (e.g. visitors). */
  secondary?: string;
  icon?: ReactNode;
};

/**
 * Breakdown card per design-system.md list rows: label + thin progress bar +
 * right-aligned mono value, hairline dividers. Bars scale to the top row.
 */
export function BreakdownCard({
  title,
  items,
  isLoading = false,
  isError = false,
  emptyTitle = "No data yet",
  emptyHint,
  action,
  valueLabel = "Visitors",
}: {
  title: string;
  items: BreakdownItem[] | undefined;
  isLoading?: boolean;
  isError?: boolean;
  emptyTitle?: string;
  emptyHint?: string;
  action?: ReactNode;
  valueLabel?: string;
}) {
  const max = Math.max(...(items ?? []).map((i) => i.value), 1);
  return (
    <section className="flex flex-col rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <header className="flex items-center justify-between gap-2 px-[18px] pb-2 pt-4">
        <h3 className="text-[14.5px] font-semibold text-foreground">{title}</h3>
        <div className="flex items-center gap-2">
          {action}
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[.5px] text-muted-foreground/70">
            {valueLabel}
          </span>
        </div>
      </header>
      <div className="flex-1 px-[18px] pb-3">
        {isLoading ? (
          <RowsSkeleton />
        ) : isError ? (
          <ErrorState />
        ) : !items || items.length === 0 ? (
          <EmptyState title={emptyTitle} hint={emptyHint} />
        ) : (
          <ul>
            {items.map((item) => (
              <li
                key={item.label}
                className="relative flex items-center gap-3 border-b border-border/60 py-[7px] last:border-b-0"
              >
                <div className="relative flex min-w-0 flex-1 items-center gap-2">
                  <div
                    className="absolute inset-y-0.5 left-0 rounded-[4px] bg-accent"
                    style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
                    aria-hidden
                  />
                  <span className="relative z-10 flex min-w-0 items-center gap-2 px-1.5 text-[13px] text-foreground">
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </span>
                </div>
                {item.secondary && (
                  <span className="shrink-0 font-mono text-[12px] text-muted-foreground">
                    {item.secondary}
                  </span>
                )}
                <span className="w-12 shrink-0 text-right font-mono text-[13px] font-medium text-foreground">
                  {formatNumber(item.value)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
