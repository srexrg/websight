import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getOverview, getLiveCount } from "@/lib/analytics/queries";
import { rangeToDates, RANGE_PRESETS, type RangePreset } from "@/lib/dashboard/range";
import type { ShareRow } from "@/lib/analytics/share";

/**
 * GET /api/share/:token/badge - minimal public JSON for embeddable widgets
 * (docs/redesign/15). Intentionally public + CORS-open + tokenized (no cookies),
 * so it works inside sandboxed iframes. Returns live visitors + a period's
 * visitors/pageviews.
 */
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "cache-control": "public, s-maxage=30, stale-while-revalidate=120",
};

export function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const admin = createAdminClient();
  const { data: share } = await admin
    .from("share_tokens")
    .select("site_id")
    .eq("token", token)
    .maybeSingle<Pick<ShareRow, "site_id">>();
  if (!share) return NextResponse.json({ error: "Not found" }, { status: 404, headers: CORS });

  const presetRaw = req.nextUrl.searchParams.get("range") ?? "7d";
  const preset = (RANGE_PRESETS as readonly string[]).includes(presetRaw) ? (presetRaw as RangePreset) : "7d";
  const range = rangeToDates(preset);

  const [overview, live] = await Promise.all([
    getOverview(share.site_id, range),
    getLiveCount(share.site_id, 5),
  ]);

  admin
    .from("share_tokens")
    .update({ last_accessed_at: new Date().toISOString() })
    .eq("token", token)
    .then(() => {});

  return NextResponse.json(
    { live, visitors: overview.visitors, pageviews: overview.pageviews, range: preset },
    { headers: CORS },
  );
}
