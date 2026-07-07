import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { resolveOwnedSite } from "@/lib/dashboard/site-owner";

/**
 * GET /api/sites/:id/install-status - onboarding verification (docs/redesign/17).
 * Returns whether any event has arrived and the most recent one, so the verify
 * card can echo it ("we see you, from Berlin, on Chrome"). Owner-only; the
 * client polls this every ~3s while the verify step is open.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ site: string }> }) {
  const { site } = await ctx.params;
  const owned = await resolveOwnedSite(site);
  if ("error" in owned) return owned.error;

  const admin = createAdminClient();
  const { data } = await admin
    .from("events")
    .select("name, path, country, device_type, browser, created_at")
    .eq("site_id", owned.siteId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{
      name: string;
      path: string | null;
      country: string | null;
      device_type: string | null;
      browser: string | null;
      created_at: string;
    }>();

  if (!data) {
    return NextResponse.json({ scriptSeen: false, firstEvent: false, sample: null });
  }
  // The tracker's first action is a pageview, so any received event means the
  // script is live. (A dedicated init ping to distinguish script-seen-but-no-
  // pageview for SPAs is a future refinement.)
  return NextResponse.json({
    scriptSeen: true,
    firstEvent: true,
    sample: {
      path: data.path,
      country: data.country,
      device: data.device_type,
      browser: data.browser,
      at: data.created_at,
    },
  });
}
