import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  getBreakdown,
  getEventBreakdown,
  getOverview,
  getTimeseries,
  type BreakdownDimension,
  type Granularity,
} from "@/lib/analytics/queries";
import { RANGE_PRESETS, rangeToDates, type RangePreset } from "@/lib/dashboard/range";

/**
 * GET /api/analytics/[site] - dashboard read API (docs/redesign/03).
 *
 * Auth: session cookie; ownership enforced by RLS on `sites` (the lookup by
 * public_id runs as the signed-in user, so foreign/unknown sites 404). The
 * actual analytics queries then run through lib/analytics/queries.ts.
 *
 * Query params:
 *   kind=overview|timeseries|breakdown|events   (required)
 *   range=24h|7d|30d|90d                        (default 7d)
 *   granularity=hour|day|week|month             (timeseries)
 *   dimension=<BreakdownDimension>              (breakdown)
 *   limit=<n>                                   (breakdown/events, max 100)
 */

const DIMENSIONS: readonly BreakdownDimension[] = [
  "path",
  "referrer_domain",
  "channel",
  "country",
  "region",
  "city",
  "device_type",
  "browser",
  "os",
  "lang",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
];

const GRANULARITIES: readonly Granularity[] = ["hour", "day", "week", "month"];

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ site: string }> },
) {
  const { site: publicId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // RLS: the signed-in user only sees their own sites.
  const { data: site } = await supabase
    .from("sites")
    .select("id")
    .eq("public_id", publicId)
    .maybeSingle();
  if (!site) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const q = req.nextUrl.searchParams;
  const preset = (RANGE_PRESETS as readonly string[]).includes(q.get("range") ?? "")
    ? (q.get("range") as RangePreset)
    : "7d";
  const range = rangeToDates(preset);
  const limit = Math.min(Math.max(Number(q.get("limit")) || 10, 1), 100);

  try {
    switch (q.get("kind")) {
      case "overview":
        return NextResponse.json(await getOverview(site.id, range));
      case "timeseries": {
        const g = q.get("granularity") as Granularity;
        return NextResponse.json(
          await getTimeseries(site.id, range, GRANULARITIES.includes(g) ? g : "day"),
        );
      }
      case "breakdown": {
        const dim = q.get("dimension") as BreakdownDimension;
        if (!DIMENSIONS.includes(dim)) {
          return NextResponse.json({ error: "Invalid dimension" }, { status: 400 });
        }
        return NextResponse.json(await getBreakdown(site.id, range, dim, limit));
      }
      case "events":
        return NextResponse.json(await getEventBreakdown(site.id, range, limit));
      default:
        return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    }
  } catch (error) {
    console.error("[api/analytics] query failed:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
