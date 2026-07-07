import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/utils/supabase/admin";
import { resolveOwnedSite } from "@/lib/dashboard/site-owner";
import { generateShareToken, type ShareRow } from "@/lib/analytics/share";

const EXPOSABLE = ["overview", "realtime", "globe", "pages", "sources", "audience"];

function sanitizeScreens(v: unknown): string[] {
  const arr = Array.isArray(v) ? v.map(String).filter((s) => EXPOSABLE.includes(s)) : [];
  return Array.from(new Set(["overview", ...arr])); // Overview is always exposed
}

/** GET - the site's current share config (owner-only), or {share:null}. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ site: string }> }) {
  const { site } = await ctx.params;
  const owned = await resolveOwnedSite(site);
  if ("error" in owned) return owned.error;
  const admin = createAdminClient();
  const { data } = await admin.from("share_tokens").select("*").eq("site_id", owned.siteId).maybeSingle<ShareRow>();
  return NextResponse.json({ share: data ? redact(data) : null });
}

/** POST - create/enable sharing (generates a token). */
export async function POST(req: NextRequest, ctx: { params: Promise<{ site: string }> }) {
  const { site } = await ctx.params;
  const owned = await resolveOwnedSite(site);
  if ("error" in owned) return owned.error;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const visibility = body.visibility === "public" ? "public" : "secret";
  const password = typeof body.password === "string" && body.password.length > 0 ? body.password : null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("share_tokens")
    .upsert(
      {
        site_id: owned.siteId,
        token: generateShareToken(),
        visibility,
        exposed_screens: sanitizeScreens(body.exposed_screens),
        hide_events: body.hide_events !== false,
        password_hash: password ? await bcrypt.hash(password, 10) : null,
        created_by: owned.userId,
      },
      { onConflict: "site_id" },
    )
    .select("*")
    .single<ShareRow>();
  if (error) return NextResponse.json({ error: "Create failed" }, { status: 500 });
  return NextResponse.json({ share: redact(data) }, { status: 201 });
}

/** PATCH - update settings, set/clear password, or rotate the token. */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ site: string }> }) {
  const { site } = await ctx.params;
  const owned = await resolveOwnedSite(site);
  if ("error" in owned) return owned.error;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  if (body.visibility === "public" || body.visibility === "secret") patch.visibility = body.visibility;
  if ("exposed_screens" in body) patch.exposed_screens = sanitizeScreens(body.exposed_screens);
  if ("hide_events" in body) patch.hide_events = body.hide_events !== false;
  if (body.rotate === true) {
    patch.token = generateShareToken();
    patch.rotated_at = new Date().toISOString();
  }
  if ("password" in body) {
    const pw = body.password;
    patch.password_hash = typeof pw === "string" && pw.length > 0 ? await bcrypt.hash(pw, 10) : null;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("share_tokens")
    .update(patch)
    .eq("site_id", owned.siteId)
    .select("*")
    .maybeSingle<ShareRow>();
  if (error || !data) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  return NextResponse.json({ share: redact(data) });
}

/** DELETE - stop sharing. */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ site: string }> }) {
  const { site } = await ctx.params;
  const owned = await resolveOwnedSite(site);
  if ("error" in owned) return owned.error;
  const admin = createAdminClient();
  const { error } = await admin.from("share_tokens").delete().eq("site_id", owned.siteId);
  if (error) return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** Never leak the password hash to the client. */
function redact(s: ShareRow) {
  return {
    token: s.token,
    visibility: s.visibility,
    exposed_screens: s.exposed_screens,
    hide_events: s.hide_events,
    has_password: !!s.password_hash,
    created_at: s.created_at,
    rotated_at: s.rotated_at,
    last_accessed_at: s.last_accessed_at,
  };
}
