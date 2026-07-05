import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { resolveOwnedSite } from "@/lib/dashboard/site-owner";
import { goalInputToRow, mapGoalRow, validateGoalInput, type GoalInput } from "@/lib/analytics/goals";

/** PATCH (edit) + DELETE (archive, history preserved) a goal (docs/redesign/08). */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ site: string; goalId: string }> },
) {
  const { site, goalId } = await ctx.params;
  const owned = await resolveOwnedSite(site);
  if ("error" in owned) return owned.error;

  const body = await req.json().catch(() => null);
  const err = validateGoalInput(body);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("goals")
    .update({ ...goalInputToRow(body as GoalInput), updated_at: new Date().toISOString() })
    .eq("id", goalId)
    .eq("site_id", owned.siteId)
    .select("*")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(mapGoalRow(data));
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ site: string; goalId: string }> },
) {
  const { site, goalId } = await ctx.params;
  const owned = await resolveOwnedSite(site);
  if ("error" in owned) return owned.error;

  const admin = createAdminClient();
  const { error } = await admin
    .from("goals")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", goalId)
    .eq("site_id", owned.siteId);
  if (error) return NextResponse.json({ error: "Archive failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
