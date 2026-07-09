import type { Filter } from "./filters";

/**
 * Goal definitions (docs/redesign/08). A goal is a page-path or custom-event
 * matcher evaluated at query time; the SQL compiler lives in the `_goal_where`
 * migration. This module holds the TS type, validation, and row mapping shared
 * by the CRUD routes and the goals UI.
 */

export type GoalKind = "page" | "event";
export type PathOp = "exact" | "contains" | "wildcard";

export type Goal = {
  id: string;
  siteId: string;
  name: string;
  kind: GoalKind;
  pathPattern: string | null;
  pathOp: PathOp | null;
  eventName: string | null;
  propFilters: Filter[];
  valueCents: number | null;
  currency: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GoalInput = {
  name: string;
  kind: GoalKind;
  pathPattern?: string | null;
  pathOp?: PathOp | null;
  eventName?: string | null;
  propFilters?: Filter[];
  valueCents?: number | null;
  currency?: string | null;
};

const PATH_OPS: PathOp[] = ["exact", "contains", "wildcard"];

/** Returns an error message, or null if the input is a valid goal definition. */
export function validateGoalInput(input: unknown): string | null {
  if (!input || typeof input !== "object") return "Invalid body";
  const g = input as Record<string, unknown>;
  if (typeof g.name !== "string" || g.name.trim() === "") return "Name is required";
  if (g.name.length > 120) return "Name is too long";
  if (g.kind !== "page" && g.kind !== "event") return "kind must be 'page' or 'event'";

  if (g.kind === "page") {
    if (typeof g.pathPattern !== "string" || g.pathPattern.trim() === "")
      return "Page goal needs a path pattern";
    if (!PATH_OPS.includes(g.pathOp as PathOp)) return "Invalid path match type";
  } else {
    if (typeof g.eventName !== "string" || g.eventName.trim() === "")
      return "Event goal needs an event name";
  }

  if (g.propFilters !== undefined && !Array.isArray(g.propFilters)) return "Invalid prop filters";
  if (g.valueCents !== undefined && g.valueCents !== null) {
    if (typeof g.valueCents !== "number" || g.valueCents < 0 || !Number.isFinite(g.valueCents))
      return "Invalid value";
  }
  if (g.currency !== undefined && g.currency !== null) {
    if (typeof g.currency !== "string" || g.currency.length !== 3) return "Invalid currency";
  }
  return null;
}

/** Normalize a validated input into the DB column shape (snake_case). */
export function goalInputToRow(input: GoalInput): Record<string, unknown> {
  const isPage = input.kind === "page";
  return {
    name: input.name.trim(),
    kind: input.kind,
    path_pattern: isPage ? (input.pathPattern ?? null) : null,
    path_op: isPage ? (input.pathOp ?? "exact") : null,
    event_name: isPage ? null : (input.eventName ?? null),
    prop_filters: isPage ? [] : (input.propFilters ?? []),
    value_cents: input.valueCents ?? null,
    currency: input.currency ?? null,
  };
}

export function mapGoalRow(r: Record<string, unknown>): Goal {
  return {
    id: r.id as string,
    siteId: r.site_id as string,
    name: r.name as string,
    kind: r.kind as GoalKind,
    pathPattern: (r.path_pattern as string | null) ?? null,
    pathOp: (r.path_op as PathOp | null) ?? null,
    eventName: (r.event_name as string | null) ?? null,
    propFilters: (r.prop_filters as Filter[] | null) ?? [],
    valueCents: (r.value_cents as number | null) ?? null,
    currency: (r.currency as string | null) ?? null,
    archivedAt: (r.archived_at as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}
