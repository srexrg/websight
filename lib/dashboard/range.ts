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
