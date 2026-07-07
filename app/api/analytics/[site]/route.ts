import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  getBreakdown,
  getDimensionValues,
  getEventBreakdown,
  getLiveBreakdown,
  getLiveCount,
  getLiveTicker,
  getFunnelResults,
  getFunnelStepVisitors,
  getFunnelTimeToConvert,
  getGoalsWithStats,
  getJourneys,
  getGoalTimeseries,
  getOverview,
  getProfileDetail,
  getProfileEventFreq,
  getProfiles,
  getProfileSessions,
  getRetention,
  getRetentionVisitors,
  getSessionEvents,
  getSessions,
  getTimeseries,
  type BreakdownDimension,
  type Granularity,
  type SessionsCursor,
} from "@/lib/analytics/queries";
import {
  getVitalsAttribution,
  getVitalsBreakdown,
  getVitalsPages,
  getVitalsSummary,
  getVitalsTimeseries,
  VITAL_METRICS,
  type VitalMetric,
} from "@/lib/analytics/vitals";
import {
  getErrorBreakdown,
  getErrorGroup,
  getErrorGroups,
  getErrorGroupStats,
  getErrorOccurrences,
  getErrorTimeseries,
  type ErrorStatus,
} from "@/lib/analytics/errors";
import { decodeFilters, isValidDim } from "@/lib/analytics/filters";
import { RANGE_PRESETS, rangeToDates, type RangePreset } from "@/lib/dashboard/range";

/**
 * GET /api/analytics/[site] - dashboard read API (docs/redesign/03).
 *
 * Auth: session cookie; ownership enforced by RLS on `sites` (the lookup by
 * public_id runs as the signed-in user, so foreign/unknown sites 404). The
 * actual analytics queries then run through lib/analytics/queries.ts.
 *
 * Query params:
 *   kind=overview|timeseries|breakdown|events|sessions|session-events|dimension-values
 *   cur_s=<ISO>&cur_id=<uuid>                   (sessions keyset cursor)
 *   session=<uuid>                              (session-events)
 *   range=24h|7d|30d|90d                        (default 7d)
 *   from=<ISO>&to=<ISO>                         (override range, e.g. comparison)
 *   f=<encoded filters>                         (docs/redesign/05 codec)
 *   granularity=hour|day|week|month             (timeseries)
 *   dimension=<BreakdownDimension>              (breakdown/dimension-values)
 *   q=<search>                                  (dimension-values)
 *   limit=<n>                                   (breakdown/events, max 100)
 */

const DIMENSIONS: readonly BreakdownDimension[] = [
  "path",
  "entry_path",
  "exit_path",
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
    .select("id, timezone")
    .eq("public_id", publicId)
    .maybeSingle();
  if (!site) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const q = req.nextUrl.searchParams;
  const preset = (RANGE_PRESETS as readonly string[]).includes(q.get("range") ?? "")
    ? (q.get("range") as RangePreset)
    : "7d";
  let range = rangeToDates(preset);
  const fromIso = q.get("from");
  const toIso = q.get("to");
  if (fromIso && toIso) {
    const from = new Date(fromIso);
    const to = new Date(toIso);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
      return NextResponse.json({ error: "Invalid from/to" }, { status: 400 });
    }
    range = { from, to };
  }
  const filters = decodeFilters(q.get("f"));
  const limit = Math.min(Math.max(Number(q.get("limit")) || 10, 1), 100);

  try {
    switch (q.get("kind")) {
      case "overview":
        return NextResponse.json(await getOverview(site.id, range, undefined, filters));
      case "timeseries": {
        const g = q.get("granularity") as Granularity;
        return NextResponse.json(
          await getTimeseries(
            site.id,
            range,
            GRANULARITIES.includes(g) ? g : "day",
            undefined,
            filters,
          ),
        );
      }
      case "breakdown": {
        const dim = q.get("dimension") as BreakdownDimension;
        if (!DIMENSIONS.includes(dim)) {
          return NextResponse.json({ error: "Invalid dimension" }, { status: 400 });
        }
        return NextResponse.json(await getBreakdown(site.id, range, dim, limit, undefined, filters));
      }
      case "events":
        return NextResponse.json(await getEventBreakdown(site.id, range, limit, undefined, filters));
      case "sessions": {
        const curS = q.get("cur_s");
        const curId = q.get("cur_id");
        const cursor: SessionsCursor | null =
          curS && curId ? { startedAt: curS, id: curId } : null;
        const pageSize = Math.min(Math.max(Number(q.get("limit")) || 50, 1), 100);
        return NextResponse.json(
          await getSessions(site.id, range, cursor, pageSize, undefined, filters),
        );
      }
      case "session-events": {
        const sessionId = q.get("session") ?? "";
        if (!/^[0-9a-f-]{36}$/i.test(sessionId)) {
          return NextResponse.json({ error: "Invalid session" }, { status: 400 });
        }
        return NextResponse.json(await getSessionEvents(site.id, sessionId));
      }
      case "profiles": {
        const offset = Math.max(Number(q.get("offset")) || 0, 0);
        return NextResponse.json(
          await getProfiles(site.id, q.get("q") ?? "", limit, offset),
        );
      }
      case "profile-detail": {
        const key = q.get("key") ?? "";
        if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });
        return NextResponse.json(await getProfileDetail(site.id, key));
      }
      case "profile-sessions": {
        const key = q.get("key") ?? "";
        if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });
        return NextResponse.json(await getProfileSessions(site.id, key, 100));
      }
      case "profile-event-freq": {
        const key = q.get("key") ?? "";
        if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });
        return NextResponse.json(await getProfileEventFreq(site.id, key));
      }
      case "goals-stats":
        return NextResponse.json(await getGoalsWithStats(site.id, range, undefined, filters));
      case "goal-timeseries": {
        const goal = q.get("goal") ?? "";
        if (!/^[0-9a-f-]{36}$/i.test(goal)) {
          return NextResponse.json({ error: "Invalid goal" }, { status: 400 });
        }
        const g = q.get("granularity") as Granularity;
        return NextResponse.json(
          await getGoalTimeseries(site.id, range, goal, GRANULARITIES.includes(g) ? g : "day", undefined, filters),
        );
      }
      case "funnel-results": {
        const funnel = q.get("funnel") ?? "";
        if (!/^[0-9a-f-]{36}$/i.test(funnel)) {
          return NextResponse.json({ error: "Invalid funnel" }, { status: 400 });
        }
        const res = await getFunnelResults(site.id, range, funnel, undefined, filters);
        if (!res) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(res);
      }
      case "funnel-step-visitors": {
        const funnel = q.get("funnel") ?? "";
        const step = Number(q.get("step"));
        const outcome = q.get("outcome");
        if (!/^[0-9a-f-]{36}$/i.test(funnel) || !Number.isInteger(step) || step < 1) {
          return NextResponse.json({ error: "Invalid funnel/step" }, { status: 400 });
        }
        if (outcome !== "converted" && outcome !== "dropped") {
          return NextResponse.json({ error: "Invalid outcome" }, { status: 400 });
        }
        return NextResponse.json(
          await getFunnelStepVisitors(site.id, range, funnel, step, outcome, undefined, filters),
        );
      }
      case "funnel-ttc": {
        const funnel = q.get("funnel") ?? "";
        if (!/^[0-9a-f-]{36}$/i.test(funnel)) {
          return NextResponse.json({ error: "Invalid funnel" }, { status: 400 });
        }
        return NextResponse.json(await getFunnelTimeToConvert(site.id, range, funnel, undefined, filters));
      }
      case "journeys": {
        const anchor = q.get("anchor") || null;
        const dir = q.get("dir") === "ends" ? "ends" : "starts";
        const steps = Math.min(Math.max(Number(q.get("steps")) || 4, 2), 6);
        const topN = Math.min(Math.max(Number(q.get("topN")) || 8, 2), 20);
        const grouping = (q.get("group") ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20);
        return NextResponse.json(
          await getJourneys(site.id, range, { anchor, direction: dir, steps, topN, grouping }, undefined, filters),
        );
      }
      case "retention":
      case "retention-visitors": {
        const interval = (["day", "week", "month"] as const).includes(
          q.get("interval") as "day" | "week" | "month",
        )
          ? (q.get("interval") as "day" | "week" | "month")
          : "week";
        const periods = Math.min(Math.max(Number(q.get("periods")) || 12, 2), 26);
        const basis = q.get("basis") === "previous" ? "previous" : "cohort";
        const uuid = (v: string | null) => (v && /^[0-9a-f-]{36}$/i.test(v) ? v : null);
        const rp = {
          interval,
          periods,
          basis: basis as "cohort" | "previous",
          entryGoal: uuid(q.get("entryGoal")),
          returnGoal: uuid(q.get("returnGoal")),
        };
        const tz = (site as { timezone?: string }).timezone ?? "UTC";
        if (q.get("kind") === "retention") {
          return NextResponse.json(await getRetention(site.id, tz, rp, undefined, filters));
        }
        const cohort = q.get("cohort") ?? "";
        const active = q.get("active") ?? "";
        if (!/^\d{4}-\d{2}-\d{2}$/.test(cohort) || !/^\d{4}-\d{2}-\d{2}$/.test(active)) {
          return NextResponse.json({ error: "Invalid cohort/active" }, { status: 400 });
        }
        return NextResponse.json(
          await getRetentionVisitors(site.id, tz, rp, cohort, active, undefined, filters),
        );
      }
      case "vitals-summary":
        return NextResponse.json(await getVitalsSummary(site.id, range, undefined, filters));
      case "vitals-timeseries": {
        const metric = q.get("metric") as VitalMetric;
        if (!VITAL_METRICS.includes(metric)) {
          return NextResponse.json({ error: "Invalid metric" }, { status: 400 });
        }
        const g = q.get("granularity") as Granularity;
        return NextResponse.json(
          await getVitalsTimeseries(
            site.id,
            range,
            metric,
            GRANULARITIES.includes(g) ? g : "day",
            undefined,
            filters,
          ),
        );
      }
      case "vitals-pages":
        return NextResponse.json(await getVitalsPages(site.id, range, undefined, filters, limit));
      case "vitals-breakdown": {
        const metric = q.get("metric") as VitalMetric;
        const dim = q.get("dimension") ?? "";
        if (!VITAL_METRICS.includes(metric)) {
          return NextResponse.json({ error: "Invalid metric" }, { status: 400 });
        }
        if (!["device_type", "browser", "os", "country", "channel"].includes(dim)) {
          return NextResponse.json({ error: "Invalid dimension" }, { status: 400 });
        }
        return NextResponse.json(
          await getVitalsBreakdown(site.id, range, dim, metric, undefined, filters, limit),
        );
      }
      case "vitals-attribution": {
        const metric = q.get("metric") as VitalMetric;
        const path = q.get("path") ?? "";
        if (!VITAL_METRICS.includes(metric) || !path) {
          return NextResponse.json({ error: "Invalid metric/path" }, { status: 400 });
        }
        return NextResponse.json(
          await getVitalsAttribution(site.id, range, path, metric, undefined, filters),
        );
      }
      case "errors": {
        const st = q.get("status");
        const status = st === "open" || st === "resolved" || st === "ignored" ? (st as ErrorStatus) : null;
        const pageSize = Math.min(Math.max(Number(q.get("limit")) || 50, 1), 200);
        return NextResponse.json(await getErrorGroups(site.id, range, status, undefined, filters, pageSize));
      }
      case "error-group": {
        const group = q.get("group") ?? "";
        if (!/^[0-9a-f-]{36}$/i.test(group)) return NextResponse.json({ error: "Invalid group" }, { status: 400 });
        const g = await getErrorGroup(site.id, group);
        if (!g) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(g);
      }
      case "error-stats": {
        const group = q.get("group") ?? "";
        if (!/^[0-9a-f-]{36}$/i.test(group)) return NextResponse.json({ error: "Invalid group" }, { status: 400 });
        return NextResponse.json(await getErrorGroupStats(site.id, group, range, undefined, filters));
      }
      case "error-timeseries": {
        const group = q.get("group") ?? "";
        if (!/^[0-9a-f-]{36}$/i.test(group)) return NextResponse.json({ error: "Invalid group" }, { status: 400 });
        const g = q.get("granularity") as Granularity;
        return NextResponse.json(
          await getErrorTimeseries(site.id, group, range, GRANULARITIES.includes(g) ? g : "day", undefined, filters),
        );
      }
      case "error-breakdown": {
        const group = q.get("group") ?? "";
        const dim = q.get("dimension") ?? "";
        if (!/^[0-9a-f-]{36}$/i.test(group)) return NextResponse.json({ error: "Invalid group" }, { status: 400 });
        if (!["path", "browser", "os", "country", "device_type"].includes(dim)) {
          return NextResponse.json({ error: "Invalid dimension" }, { status: 400 });
        }
        return NextResponse.json(await getErrorBreakdown(site.id, group, range, dim, undefined, filters));
      }
      case "error-occurrences": {
        const group = q.get("group") ?? "";
        if (!/^[0-9a-f-]{36}$/i.test(group)) return NextResponse.json({ error: "Invalid group" }, { status: 400 });
        return NextResponse.json(await getErrorOccurrences(site.id, group, range, undefined, filters));
      }
      case "live-count":
        return NextResponse.json({ count: await getLiveCount(site.id, 5, filters) });
      case "live-breakdown": {
        const dim = q.get("dimension") ?? "";
        return NextResponse.json(await getLiveBreakdown(site.id, dim, 5, limit, filters));
      }
      case "live-series": {
        const to = new Date();
        const from = new Date(to.getTime() - 30 * 60_000);
        return NextResponse.json(
          await getTimeseries(site.id, { from, to }, "minute", undefined, filters),
        );
      }
      case "live-ticker": {
        const after = Math.max(Number(q.get("after")) || 0, 0);
        return NextResponse.json(await getLiveTicker(site.id, after, limit));
      }
      case "dimension-values": {
        const dim = q.get("dimension") ?? "";
        if (!isValidDim(dim) || dim.startsWith("prop:")) {
          return NextResponse.json({ error: "Invalid dimension" }, { status: 400 });
        }
        return NextResponse.json(
          await getDimensionValues(site.id, range, dim, q.get("q") ?? "", limit),
        );
      }
      default:
        return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    }
  } catch (error) {
    console.error("[api/analytics] query failed:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
