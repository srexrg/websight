import type { BreakdownRow } from "@/lib/analytics/queries";
import type { BreakdownItem } from "@/components/dashboard/breakdown-card";
import { formatNumber } from "@/lib/dashboard/format";

const regionNames =
  typeof Intl !== "undefined" ? new Intl.DisplayNames(["en"], { type: "region" }) : null;

export function countryName(code: string): string {
  if (!code || code.length !== 2) return code;
  try {
    return regionNames?.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

export function countryFlag(code: string): string {
  if (!code || code.length !== 2 || !/^[a-z]{2}$/i.test(code)) return "";
  const base = 0x1f1e6 - 65;
  const cc = code.toUpperCase();
  return String.fromCodePoint(base + cc.charCodeAt(0), base + cc.charCodeAt(1));
}

export function countryItems(rows: BreakdownRow[] | undefined): BreakdownItem[] | undefined {
  return rows?.map((r) => ({
    label: `${countryFlag(r.value)} ${countryName(r.value)}`.trim(),
    value: r.visitors,
  }));
}

export function toItems(rows: BreakdownRow[] | undefined, withViews = false): BreakdownItem[] | undefined {
  return rows?.map((r) => ({
    label: r.value,
    value: r.visitors,
    secondary: withViews ? `${formatNumber(r.pageviews)} views` : undefined,
  }));
}
