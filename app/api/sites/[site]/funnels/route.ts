import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { resolveOwnedSite } from "@/lib/dashboard/site-owner";
import {
  funnelInputToRow,
  mapFunnelRow,
  validateFunnelInput,
  type FunnelInput,
} from "@/lib/analytics/funnels";

/** GET (list active funnels) + POST (create) for a site (docs/redesign/09). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ site: string }> }) {
  const { site } = await ctx.params;
  const owned = await resolveOwnedSite(site);
  if ("error" in owned) return owned.error;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("funnels")
    .select("*")
    .eq("site_id", owned.siteId)
    .is("archived_at", null)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: "Query failed" }, { status: 500 });
  return NextResponse.json((data ?? []).map(mapFunnelRow));
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ site: string }> }) {
  const { site } = await ctx.params;
  const owned = await resolveOwnedSite(site);
  if ("error" in owned) return owned.error;

  const body = await req.json().catch(() => null);
  const err = validateFunnelInput(body);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("funnels")
    .insert({ site_id: owned.siteId, created_by: owned.userId, ...funnelInputToRow(body as FunnelInput) })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: "Create failed" }, { status: 500 });
  return NextResponse.json(mapFunnelRow(data), { status: 201 });
}
