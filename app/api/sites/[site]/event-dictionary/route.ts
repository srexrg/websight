import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { resolveOwnedSite } from "@/lib/dashboard/site-owner";

/**
 * PATCH /api/sites/:id/event-dictionary - annotate a custom event with a
 * description + expected prop keys (docs/redesign/14 governance). Owner-only.
 * The dictionary row itself is auto-created at ingest; this only edits metadata.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ site: string }> }) {
  const { site } = await ctx.params;
  const owned = await resolveOwnedSite(site);
  if ("error" in owned) return owned.error;

  const body = (await req.json().catch(() => null)) as
    | { name?: string; description?: string | null; expected_props?: string[] }
    | null;
  if (!body?.name) return NextResponse.json({ error: "Missing name" }, { status: 400 });

  const expected = Array.isArray(body.expected_props)
    ? body.expected_props.map((s) => String(s).slice(0, 60)).slice(0, 30)
    : undefined;

  const patch: Record<string, unknown> = {};
  if ("description" in body) patch.description = body.description ? String(body.description).slice(0, 280) : null;
  if (expected !== undefined) patch.expected_props = expected;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("event_dictionary")
    .update(patch)
    .eq("site_id", owned.siteId)
    .eq("name", body.name);
  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
