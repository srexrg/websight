"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { CaretDown, FunnelSimple, X } from "@phosphor-icons/react";
import {
  FILTER_DIMENSIONS,
  FILTER_OPS,
  OP_LABELS,
  filterSummary,
  type FilterOp,
} from "@/lib/analytics/filters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatNumber } from "@/lib/dashboard/format";
import { useDimensionValues, useFilters } from "@/lib/dashboard/use-analytics";
import { rangeParser } from "@/lib/dashboard/range";
import { useQueryState } from "nuqs";

/**
 * Global filter bar (docs/redesign/05): active filter pills + editor.
 * Esc clears all filters; every screen shares this via the site layout.
 */
export function FilterBar() {
  const { filters, removeAt, clear, add } = useFilters();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (open) setOpen(false);
      else if (filters.length > 0) clear();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filters.length, clear, open]);

  if (filters.length === 0 && !open) {
    return (
      <div className="flex items-center gap-2 border-b border-border bg-page px-6 py-2">
        <FilterButton onClick={() => setOpen(true)} />
      </div>
    );
  }

  return (
    <div className="relative flex flex-wrap items-center gap-2 border-b border-border bg-page px-6 py-2">
      <FilterButton onClick={() => setOpen((o) => !o)} />
      {filters.map((f, i) => (
        <span
          key={`${f.dim}-${f.op}-${i}`}
          className="flex items-center gap-1.5 rounded-full border border-brand/25 bg-accent py-1 pl-3 pr-1.5 text-[12px] font-medium text-accent-foreground"
        >
          <span className="max-w-64 truncate">{filterSummary(f)}</span>
          <button
            onClick={() => removeAt(i)}
            className="rounded-full p-0.5 hover:bg-brand/15"
            aria-label={`Remove filter ${filterSummary(f)}`}
          >
            <X size={11} weight="bold" />
          </button>
        </span>
      ))}
      {filters.length > 0 && (
        <button
          onClick={clear}
          className="text-[12px] font-medium text-muted-foreground hover:text-foreground"
        >
          Clear all
        </button>
      )}
      {open && <FilterEditor onApply={(dim, op, value) => add(dim, value, op)} onClose={() => setOpen(false)} />}
    </div>
  );
}

function FilterButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[12.5px] font-semibold text-foreground shadow-[0_1px_2px_rgba(16,24,40,.04)] hover:bg-secondary"
    >
      <FunnelSimple size={14} />
      Filter
      <CaretDown size={11} className="text-muted-foreground" />
    </button>
  );
}

function FilterEditor({
  onApply,
  onClose,
}: {
  onApply: (dim: string, op: FilterOp, value: string) => void;
  onClose: () => void;
}) {
  const { site } = useParams<{ site: string }>();
  const [range] = useQueryState("range", rangeParser);
  const [dim, setDim] = useState(FILTER_DIMENSIONS[0].dim);
  const [op, setOp] = useState<FilterOp>("is");
  const [value, setValue] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  const suggestions = useDimensionValues(site, { range }, dim, value);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      // Radix Select portals its dropdown to <body>; clicks inside it are not
      // "outside" even though they miss the panel element.
      if (target?.closest("[data-radix-popper-content-wrapper]")) return;
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [onClose]);

  const apply = (v: string) => {
    const trimmed = v.trim();
    if (!trimmed) return;
    onApply(dim, op, trimmed);
    setValue("");
    onClose();
  };

  return (
    <div
      ref={panelRef}
      className="absolute left-6 top-full z-30 mt-1 w-[380px] rounded-xl border border-border bg-popover p-3 shadow-[0_4px_14px_rgba(16,24,40,.12)]"
    >
      <div className="flex gap-2">
        <Select value={dim} onValueChange={setDim}>
          <SelectTrigger className="h-8 flex-1 px-2 text-[12.5px] shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTER_DIMENSIONS.map((d) => (
              <SelectItem key={d.dim} value={d.dim} className="text-[12.5px]">
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={op} onValueChange={(v) => setOp(v as FilterOp)}>
          <SelectTrigger className="h-8 w-32 shrink-0 px-2 text-[12.5px] shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTER_OPS.map((o) => (
              <SelectItem key={o} value={o} className="text-[12.5px]">
                {OP_LABELS[o]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") apply(value);
          if (e.key === "Escape") onClose();
        }}
        placeholder="Value..."
        className="mt-2 h-8 w-full rounded-lg border border-input bg-card px-2.5 font-mono text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-ring/40"
      />
      <div className="mt-1.5 max-h-52 overflow-y-auto">
        {suggestions.data?.map((s) => (
          <button
            key={s.value}
            onClick={() => apply(s.value)}
            className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[12.5px] text-foreground hover:bg-secondary"
          >
            <span className="truncate">{s.value}</span>
            <span className="ml-2 shrink-0 font-mono text-[11px] text-muted-foreground">
              {formatNumber(s.count)}
            </span>
          </button>
        ))}
        {suggestions.isPending && (
          <p className="px-2 py-1.5 text-[12px] text-muted-foreground">Loading values...</p>
        )}
        {suggestions.data?.length === 0 && (
          <p className="px-2 py-1.5 text-[12px] text-muted-foreground">
            No matches - press Enter to filter on the typed value.
          </p>
        )}
      </div>
    </div>
  );
}
