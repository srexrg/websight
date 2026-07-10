import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { resolveOwnedSite } from "@/lib/dashboard/site-owner";

/**
 * PATCH /api/sites/:id/settings - merge whitelisted keys into sites.settings
 * (docs/redesign/12). Owner-only. Currently: vitals_enabled (bool),
 * vitals_sample_rate (0..1), errors_enabled (bool), replay_enabled (bool),
 * replay_mask_text (bool), replay_sample_rate (0..1), replay_retention_days
 * (1..365, docs/redesign/24). Unknown keys are ignored.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ site: string }> }) {
  const { site } = await ctx.params;
  const owned = await resolveOwnedSite(site);
  if ("error" in owned) return owned.error;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if ("vitals_enabled" in body) patch.vitals_enabled = body.vitals_enabled === true;
  if ("errors_enabled" in body) patch.errors_enabled = body.errors_enabled === true;
  if ("vitals_sample_rate" in body) {
    const r = Number(body.vitals_sample_rate);
    if (!(r >= 0 && r <= 1)) {
      return NextResponse.json({ error: "vitals_sample_rate must be 0..1" }, { status: 400 });
    }
    patch.vitals_sample_rate = r;
  }
  if ("replay_enabled" in body) patch.replay_enabled = body.replay_enabled === true;
  if ("replay_mask_text" in body) patch.replay_mask_text = body.replay_mask_text === true;
  if ("replay_sample_rate" in body) {
    const r = Number(body.replay_sample_rate);
    if (!(r >= 0 && r <= 1)) {
      return NextResponse.json({ error: "replay_sample_rate must be 0..1" }, { status: 400 });
    }
    patch.replay_sample_rate = r;
  }
  if ("replay_retention_days" in body) {
    const d = Number(body.replay_retention_days);
    if (!Number.isInteger(d) || d < 1 || d > 365) {
      return NextResponse.json({ error: "replay_retention_days must be 1..365" }, { status: 400 });
    }
    patch.replay_retention_days = d;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No known settings keys" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: current, error: readErr } = await admin
    .from("sites")
    .select("settings")
    .eq("id", owned.siteId)
    .single();
  if (readErr) return NextResponse.json({ error: "Read failed" }, { status: 500 });

  const merged = { ...(current?.settings as Record<string, unknown> | null ?? {}), ...patch };
  const { error } = await admin.from("sites").update({ settings: merged }).eq("id", owned.siteId);
  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  return NextResponse.json({ settings: merged });
}
