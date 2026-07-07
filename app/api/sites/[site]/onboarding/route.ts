import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { resolveOwnedSite } from "@/lib/dashboard/site-owner";

/**
 * GET /api/sites/:id/onboarding - getting-started checklist status
 * (docs/redesign/17). Everything derives from data (no stored flags), so the
 * checklist self-completes. `mature` gates whether the Overview shows the card.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ site: string }> }) {
  const { site } = await ctx.params;
  const owned = await resolveOwnedSite(site);
  if ("error" in owned) return owned.error;
  const admin = createAdminClient();

  const [total, pageview, custom, goals] = await Promise.all([
    admin.from("events").select("id", { count: "exact", head: true }).eq("site_id", owned.siteId),
    admin.from("events").select("id", { count: "exact", head: true }).eq("site_id", owned.siteId).eq("name", "pageview"),
    admin
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("site_id", owned.siteId)
      .not("name", "in", "(pageview,web_vital,error,identify)"),
    admin.from("goals").select("id", { count: "exact", head: true }).eq("site_id", owned.siteId).is("archived_at", null),
  ]);

  const totalEvents = total.count ?? 0;
  return NextResponse.json({
    installed: totalEvents > 0,
    hasPageview: (pageview.count ?? 0) > 0,
    hasCustomEvent: (custom.count ?? 0) > 0,
    hasGoal: (goals.count ?? 0) > 0,
    // "Mature" once there's a meaningful amount of data; hides the checklist.
    mature: totalEvents >= 50,
  });
}
