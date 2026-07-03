import { NextRequest, NextResponse } from "next/server";
import { corsHeaders } from "@/utils/cors";
import { createAdminClient } from "@/utils/supabase/admin";
import { ingestEvents } from "@/lib/analytics/ingest";
import { resolveSite } from "@/lib/analytics/sites";

/**
 * POST /api/events - legacy custom-event API (Bearer = users.api).
 *
 * Kept for backward compatibility (docs/redesign/02); the v2 event API is
 * plan 14. Writes to events_legacy (renamed old table) and dual-writes a
 * custom event into the new pipeline with sessionize=false so server-emitted
 * events never fabricate visitor sessions.
 */

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const admin = createAdminClient();

    const authHeader = req.headers.get("authorization");
    const { name, domain, description } = await req.json();

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid API" },
        { status: 401, headers: corsHeaders },
      );
    }

    const apiKey = authHeader.split("Bearer ")[1];
    const { data: users, error: userError } = await admin
      .from("users")
      .select("id")
      .eq("api", apiKey);

    if (userError || !users || users.length === 0) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid API Key" },
        { status: 401, headers: corsHeaders },
      );
    }

    if (!name?.trim() || !domain?.trim()) {
      return NextResponse.json(
        { error: "name or domain fields must not be empty." },
        { headers: corsHeaders },
      );
    }

    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/i, "");
    const eventName = name.toLowerCase();

    const { error: eventError } = await admin.from("events_legacy").insert([
      {
        event_name: eventName,
        website_id: cleanDomain,
        message: description,
      },
    ]);

    if (eventError) {
      return NextResponse.json(
        { error: eventError.message },
        { status: 400, headers: corsHeaders },
      );
    }

    // Dual-write into the new events table (best effort).
    try {
      const site = await resolveSite(admin, cleanDomain);
      if (site) {
        await ingestEvents(admin, [
          {
            site_id: site.id,
            name: eventName,
            visitor_id: `api:${users[0].id}`,
            path: "/",
            props: description ? { message: description } : null,
            sessionize: false,
          },
        ]);
      }
    } catch (err) {
      console.error("[events] dual-write failed:", err);
    }

    return NextResponse.json({ message: "success" }, { headers: corsHeaders });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500, headers: corsHeaders },
    );
  }
}
