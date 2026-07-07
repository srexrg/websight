import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { resolveOwnedSite } from "@/lib/dashboard/site-owner";

/**
 * PATCH /api/sites/:id/errors/:groupId - triage an error group's status
 * (open / resolved / ignored). Owner-only. Resolving stamps resolved_at and
 * clears the regressed flag; the ingest trigger auto-reopens a resolved group
 * (regressed=true) if it recurs.
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ site: string; groupId: string }> },
) {
  const { site, groupId } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(groupId)) {
    return NextResponse.json({ error: "Invalid group" }, { status: 400 });
  }
  const owned = await resolveOwnedSite(site);
  if ("error" in owned) return owned.error;

  const body = (await req.json().catch(() => null)) as { status?: string } | null;
  const status = body?.status;
  if (status !== "open" && status !== "resolved" && status !== "ignored") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("error_groups")
    .update({
      status,
      resolved_at: status === "resolved" ? new Date().toISOString() : null,
      regressed: false,
    })
    .eq("id", groupId)
    .eq("site_id", owned.siteId);
  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
