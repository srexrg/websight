"use client";

import { usePathname } from "next/navigation";
import { useQueryState } from "nuqs";
import type { ReactNode } from "react";
import { screenTitle } from "@/lib/dashboard/nav";
import { RANGE_LABELS, RANGE_PRESETS, rangeParser } from "@/lib/dashboard/range";

/**
 * Per-screen top bar: title, time-range tabs (URL state via nuqs), actions
 * slot. The live-visitor pill arrives with plan 06, filters with plan 05.
 */
export function Topbar({ actions }: { actions?: ReactNode }) {
  const pathname = usePathname();
  const slug = pathname.split("/")[2] ?? "overview";
  const [range, setRange] = useQueryState("range", rangeParser.withOptions({ shallow: false }));

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-page/85 px-6 py-3.5 backdrop-blur">
      <h1 className="text-[21px] font-bold tracking-[-.4px] text-foreground">{screenTitle(slug)}</h1>
      <div className="flex items-center gap-2">
        {slug !== "settings" && (
          <div className="flex rounded-lg border border-border bg-card p-0.5 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
            {RANGE_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setRange(preset)}
                className={`rounded-md px-2.5 py-1 font-mono text-[12px] font-semibold tracking-[.4px] transition-colors ${
                  range === preset
                    ? "bg-accent text-accent-foreground shadow-[0_1px_2px_rgba(16,24,40,.06)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {RANGE_LABELS[preset]}
              </button>
            ))}
          </div>
        )}
        {actions}
      </div>
    </header>
  );
}
