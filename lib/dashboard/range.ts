// nuqs/server: parser only (no hooks), safe to import from route handlers too.
import { parseAsStringLiteral } from "nuqs/server";
import type { Granularity } from "@/lib/analytics/queries";

/**
 * Shared date-range URL state (docs/redesign/03). Presets match the mock's
 * time-range tabs; plan 05 extends this with custom from/to + comparison.
 * All URL state goes through nuqs so every view is shareable.
 */

export const RANGE_PRESETS = ["24h", "7d", "30d", "90d"] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];

export const rangeParser = parseAsStringLiteral(RANGE_PRESETS).withDefault("7d");

const HOURS: Record<RangePreset, number> = {
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
  "90d": 24 * 90,
};

export function rangeToDates(preset: RangePreset, now = new Date()): { from: Date; to: Date } {
  return { from: new Date(now.getTime() - HOURS[preset] * 3600_000), to: now };
}

export function rangeGranularity(preset: RangePreset): Granularity {
  switch (preset) {
    case "24h":
      return "hour";
    case "90d":
      return "week";
    default:
      return "day";
  }
}

export const RANGE_LABELS: Record<RangePreset, string> = {
  "24h": "24h",
  "7d": "7d",
  "30d": "30d",
  "90d": "90d",
};

// ---------------------------------------------------------------- comparison

export const COMPARE_MODES = ["off", "prev", "yoy"] as const;
export type CompareMode = (typeof COMPARE_MODES)[number];

export const compareParser = parseAsStringLiteral(COMPARE_MODES).withDefault("off");

export const COMPARE_LABELS: Record<CompareMode, string> = {
  off: "No comparison",
  prev: "Previous period",
  yoy: "Year over year",
};

/**
 * Comparison range for a given current range (docs/redesign/04): "prev" is
 * the immediately preceding period of equal length; "yoy" shifts one year.
 * The comparison period always gets identical filters.
 */
export function comparisonRange(
  range: { from: Date; to: Date },
  mode: CompareMode,
): { from: Date; to: Date } | null {
  if (mode === "off") return null;
  if (mode === "yoy") {
    const from = new Date(range.from);
    const to = new Date(range.to);
    from.setFullYear(from.getFullYear() - 1);
    to.setFullYear(to.getFullYear() - 1);
    return { from, to };
  }
  const span = range.to.getTime() - range.from.getTime();
  return { from: new Date(range.from.getTime() - span), to: new Date(range.from) };
}

/** Relative delta (0.12 = +12%); null when the previous value is 0 ("new"). */
export function relativeDelta(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous === 0) return null;
  return (current - previous) / previous;
}
