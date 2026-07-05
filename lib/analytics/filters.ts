/**
 * Canonical filter model + URL codec (docs/redesign/05). Shared by client
 * (nuqs state, filter UI) and server (API route -> analytics_* RPCs, where
 * the SQL translation lives in _analytics_where).
 *
 * URL shape: f=country:is:US,DE;path:contains:/blog
 * Values are percent-escaped so ':' ';' ',' '%' survive round-trips.
 */

export type FilterOp = "is" | "is_not" | "contains" | "not_contains";

export type Filter = {
  dim: string;
  op: FilterOp;
  values: string[];
};

export const FILTER_OPS: readonly FilterOp[] = ["is", "is_not", "contains", "not_contains"];

export const OP_LABELS: Record<FilterOp, string> = {
  is: "is",
  is_not: "is not",
  contains: "contains",
  not_contains: "does not contain",
};

/** Filterable dimensions with UI labels. "prop:<key>" is also accepted. */
export const FILTER_DIMENSIONS: { dim: string; label: string }[] = [
  { dim: "path", label: "Page" },
  { dim: "entry_path", label: "Entry page" },
  { dim: "exit_path", label: "Exit page" },
  { dim: "channel", label: "Channel" },
  { dim: "referrer_domain", label: "Referrer" },
  { dim: "utm_source", label: "UTM source" },
  { dim: "utm_medium", label: "UTM medium" },
  { dim: "utm_campaign", label: "UTM campaign" },
  { dim: "utm_term", label: "UTM term" },
  { dim: "utm_content", label: "UTM content" },
  { dim: "country", label: "Country" },
  { dim: "region", label: "Region" },
  { dim: "city", label: "City" },
  { dim: "device_type", label: "Device type" },
  { dim: "browser", label: "Browser" },
  { dim: "os", label: "OS" },
  { dim: "lang", label: "Language" },
  { dim: "name", label: "Event name" },
];

const KNOWN_DIMS = new Set(FILTER_DIMENSIONS.map((d) => d.dim));

export function isValidDim(dim: string): boolean {
  return KNOWN_DIMS.has(dim) || (/^prop:.{1,64}$/.test(dim) && !dim.includes(";"));
}

export function dimLabel(dim: string): string {
  const known = FILTER_DIMENSIONS.find((d) => d.dim === dim);
  if (known) return known.label;
  return dim.startsWith("prop:") ? `Prop ${dim.slice(5)}` : dim;
}

const MAX_VALUES = 20;

function escapeValue(v: string): string {
  return v.replace(/[%:;,]/g, (c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"));
}

function unescapeValue(v: string): string {
  try {
    return decodeURIComponent(v.replace(/\+/g, "%2b"));
  } catch {
    return v;
  }
}

export function encodeFilters(filters: Filter[]): string {
  return filters
    .filter((f) => f.values.length > 0)
    .map((f) => `${f.dim}:${f.op}:${f.values.slice(0, MAX_VALUES).map(escapeValue).join(",")}`)
    .join(";");
}

export function decodeFilters(raw: string | null | undefined): Filter[] {
  if (!raw) return [];
  const out: Filter[] = [];
  for (const part of raw.split(";")) {
    const first = part.indexOf(":");
    if (first === -1) continue;
    let rest = part.slice(first + 1);
    let dim = part.slice(0, first);
    // prop dims contain a ':' themselves (prop:key:is:v)
    if (dim === "prop") {
      const second = rest.indexOf(":");
      if (second === -1) continue;
      dim = `prop:${rest.slice(0, second)}`;
      rest = rest.slice(second + 1);
    }
    const opEnd = rest.indexOf(":");
    if (opEnd === -1) continue;
    const op = rest.slice(0, opEnd) as FilterOp;
    if (!FILTER_OPS.includes(op) || !isValidDim(dim)) continue;
    const values = rest
      .slice(opEnd + 1)
      .split(",")
      .map(unescapeValue)
      .filter(Boolean)
      .slice(0, MAX_VALUES);
    if (values.length > 0) out.push({ dim, op, values });
  }
  return out;
}

/** Add or extend a filter (click-to-filter): same dim+op merges values. */
export function addFilter(filters: Filter[], dim: string, value: string, op: FilterOp = "is"): Filter[] {
  const existing = filters.find((f) => f.dim === dim && f.op === op);
  if (existing) {
    if (existing.values.includes(value)) return filters;
    return filters.map((f) =>
      f === existing ? { ...f, values: [...f.values, value].slice(0, MAX_VALUES) } : f,
    );
  }
  return [...filters, { dim, op, values: [value] }];
}

export function removeFilter(filters: Filter[], index: number): Filter[] {
  return filters.filter((_, i) => i !== index);
}

export function filterSummary(f: Filter): string {
  const vals = f.values.length > 2 ? `${f.values.slice(0, 2).join(", ")} +${f.values.length - 2}` : f.values.join(", ");
  return `${dimLabel(f.dim)} ${OP_LABELS[f.op]} ${vals}`;
}
