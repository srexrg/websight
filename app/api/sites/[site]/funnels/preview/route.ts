import { NextRequest, NextResponse } from "next/server";
import { resolveOwnedSite } from "@/lib/dashboard/site-owner";
import { validateFunnelInput, type FunnelStep } from "@/lib/analytics/funnels";
import { computeFunnel } from "@/lib/analytics/queries";

/**
 * POST /api/sites/[site]/funnels/preview - compute an unsaved funnel definition
 * over the last 7 days (live editor preview). Owner-only.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ site: string }> }) {
  const { site } = await ctx.params;
  const owned = await resolveOwnedSite(site);
  if ("error" in owned) return owned.error;

  const body = (await req.json().catch(() => null)) as
    | { steps?: FunnelStep[]; windowMinutes?: number }
    | null;
  // Validate as a funnel (a placeholder name satisfies the shared validator).
  const err = validateFunnelInput({ name: "preview", steps: body?.steps, windowMinutes: body?.windowMinutes });
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const to = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  const results = await computeFunnel(
    owned.siteId,
    { from, to },
    body!.steps as FunnelStep[],
    body!.windowMinutes as number,
  );
  return NextResponse.json(results);
}
