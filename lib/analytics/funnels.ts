import type { Filter } from "./filters";
import type { PathOp } from "./goals";

/**
 * Funnel definitions (docs/redesign/09). An ordered list of step matchers
 * (page / event / saved-goal) evaluated sequentially over `events`. The SQL
 * compiler lives in the `analytics_funnel` migration; this module holds the TS
 * types, validation, row mapping, and step labels shared by routes and UI.
 */

export type FunnelStep =
  | { kind: "page"; pathOp: PathOp; pathPattern: string; label?: string }
  | { kind: "event"; eventName: string; propFilters?: Filter[]; label?: string }
  | { kind: "goal"; goalId: string; label?: string };

export type Funnel = {
  id: string;
  siteId: string;
  name: string;
  steps: FunnelStep[];
  windowMinutes: number;
  baseFilters: Filter[];
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FunnelInput = {
  name: string;
  steps: FunnelStep[];
  windowMinutes: number;
  baseFilters?: Filter[];
};

const PATH_OPS: PathOp[] = ["exact", "contains", "wildcard"];
/** Allowed conversion windows in minutes (30m / 1d / 7d / 30d). */
export const FUNNEL_WINDOWS = [30, 1440, 10080, 43200] as const;

export function windowLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min window`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} hr window`;
  return `${Math.round(minutes / 1440)} day window`;
}

function validStep(s: unknown): string | null {
  if (!s || typeof s !== "object") return "Invalid step";
  const step = s as Record<string, unknown>;
  if (step.kind === "page") {
    if (typeof step.pathPattern !== "string" || step.pathPattern.trim() === "")
      return "Page step needs a path";
    if (!PATH_OPS.includes(step.pathOp as PathOp)) return "Invalid path match type";
  } else if (step.kind === "event") {
    if (typeof step.eventName !== "string" || step.eventName.trim() === "")
      return "Event step needs an event name";
    if (step.propFilters !== undefined && !Array.isArray(step.propFilters))
      return "Invalid prop filters";
  } else if (step.kind === "goal") {
    if (typeof step.goalId !== "string" || !/^[0-9a-f-]{36}$/i.test(step.goalId))
      return "Invalid goal step";
  } else {
    return "Step must be page, event, or goal";
  }
  return null;
}

/** Returns an error message, or null if the input is a valid funnel. */
export function validateFunnelInput(input: unknown): string | null {
  if (!input || typeof input !== "object") return "Invalid body";
  const f = input as Record<string, unknown>;
  if (typeof f.name !== "string" || f.name.trim() === "") return "Name is required";
  if (f.name.length > 120) return "Name is too long";
  if (!Array.isArray(f.steps)) return "Steps must be a list";
  if (f.steps.length < 2) return "A funnel needs at least 2 steps";
  if (f.steps.length > 8) return "A funnel can have at most 8 steps";
  for (const s of f.steps) {
    const err = validStep(s);
    if (err) return err;
  }
  if (typeof f.windowMinutes !== "number" || f.windowMinutes <= 0) return "Invalid conversion window";
  if (f.baseFilters !== undefined && !Array.isArray(f.baseFilters)) return "Invalid base filters";
  return null;
}

export function funnelInputToRow(input: FunnelInput): Record<string, unknown> {
  return {
    name: input.name.trim(),
    steps: input.steps,
    window_minutes: input.windowMinutes,
    base_filters: input.baseFilters ?? [],
  };
}

export function mapFunnelRow(r: Record<string, unknown>): Funnel {
  return {
    id: r.id as string,
    siteId: r.site_id as string,
    name: r.name as string,
    steps: (r.steps as FunnelStep[] | null) ?? [],
    windowMinutes: Number(r.window_minutes),
    baseFilters: (r.base_filters as Filter[] | null) ?? [],
    archivedAt: (r.archived_at as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

/** Default human label for a step, e.g. "Visited /pricing" or "signup_click". */
export function stepLabel(s: FunnelStep): string {
  if (s.label && s.label.trim()) return s.label;
  if (s.kind === "page") {
    const verb = s.pathOp === "exact" ? "Visited" : s.pathOp === "contains" ? "Path contains" : "Path matches";
    return `${verb} ${s.pathPattern}`;
  }
  if (s.kind === "event") return s.eventName;
  return "Goal";
}
