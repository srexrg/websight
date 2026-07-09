"use client";

import type { ReactNode } from "react";
import { formatNumber } from "@/lib/dashboard/format";
import { EmptyState, ErrorState, RowsSkeleton } from "./states";

export type BreakdownItem = {
  label: string;
  /** Raw value used for click-to-filter (defaults to label). */
  filterValue?: string;
  value: number;
  /** Optional secondary mono column (e.g. views). */
  secondary?: string;
  icon?: ReactNode;
};

export type BreakdownTab = { key: string; label: string };

/**
 * Breakdown card per design-system.md list rows: label + thin progress bar +
 * right-aligned mono value, hairline dividers. Bars scale to the top row.
 * Rows are click-to-filter (docs/redesign/05); tabs switch sub-dimensions.
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
  tabs,
  activeTab,
  onTabChange,
  onRowClick,
  activeValues,
}: {
  title: string;
  items: BreakdownItem[] | undefined;
  isLoading?: boolean;
  isError?: boolean;
  emptyTitle?: string;
  emptyHint?: string;
  action?: ReactNode;
  valueLabel?: string;
  tabs?: BreakdownTab[];
  activeTab?: string;
  onTabChange?: (key: string) => void;
  onRowClick?: (filterValue: string) => void;
  /** Values currently active as filters - highlighted instead of hidden. */
  activeValues?: string[];
}) {
  const max = Math.max(...(items ?? []).map((i) => i.value), 1);
  return (
    <section className="flex flex-col rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <header className="flex flex-wrap items-center justify-between gap-2 px-[18px] pb-2 pt-4">
        <div className="flex items-center gap-3">
          <h3 className="text-[14.5px] font-semibold text-foreground">{title}</h3>
          {tabs && tabs.length > 1 && (
            <div className="flex rounded-md bg-secondary p-0.5">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => onTabChange?.(t.key)}
                  className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold tracking-[.4px] transition-colors ${
                    activeTab === t.key
                      ? "bg-card text-foreground shadow-[0_1px_2px_rgba(16,24,40,.06)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
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
            {items.map((item) => {
              const fv = item.filterValue ?? item.label;
              const active = activeValues?.includes(fv);
              return (
                <li
                  key={item.label}
                  className="relative border-b border-border/60 last:border-b-0"
                >
                  <button
                    onClick={onRowClick ? () => onRowClick(fv) : undefined}
                    disabled={!onRowClick}
                    title={onRowClick ? "Click to filter" : undefined}
                    className={`flex w-full items-center gap-3 py-[7px] text-left ${
                      onRowClick ? "cursor-pointer" : "cursor-default"
                    }`}
                  >
                    <span className="relative flex min-w-0 flex-1 items-center">
                      <span
                        className={`absolute inset-y-0.5 left-0 rounded-[4px] ${
                          active ? "bg-brand/25" : "bg-accent"
                        }`}
                        style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
                        aria-hidden
                      />
                      <span
                        className={`relative z-10 flex min-w-0 items-center gap-2 px-1.5 text-[13px] ${
                          active ? "font-semibold text-accent-foreground" : "text-foreground"
                        } ${onRowClick ? "hover:underline" : ""}`}
                      >
                        {item.icon}
                        <span className="truncate">{item.label}</span>
                      </span>
                    </span>
                    {item.secondary && (
                      <span className="shrink-0 font-mono text-[12px] text-muted-foreground">
                        {item.secondary}
                      </span>
                    )}
                    <span className="w-12 shrink-0 text-right font-mono text-[13px] font-medium text-foreground">
                      {formatNumber(item.value)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
