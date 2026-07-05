import { NextRequest, NextResponse } from "next/server";
import { resolveOwnedSite } from "@/lib/dashboard/site-owner";
import { validateGoalInput, type GoalInput } from "@/lib/analytics/goals";
import { getGoalPreview } from "@/lib/analytics/queries";

/**
 * POST /api/sites/[site]/goals/preview - match count for an unsaved definition
 * over the last 7 days (create/edit dialog affordance). Owner-only.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ site: string }> }) {
  const { site } = await ctx.params;
  const owned = await resolveOwnedSite(site);
  if ("error" in owned) return owned.error;

  const body = await req.json().catch(() => null);
  const err = validateGoalInput(body);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  const b = body as GoalInput;

  const to = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  const preview = await getGoalPreview(owned.siteId, { from, to }, {
    kind: b.kind,
    pathOp: b.pathOp ?? null,
    pathPattern: b.pathPattern ?? null,
    eventName: b.eventName ?? null,
    propFilters: b.propFilters ?? [],
  });
  return NextResponse.json(preview);
}
