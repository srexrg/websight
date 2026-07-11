import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { deleteReplayObjects, replayStorageConfigured } from "@/lib/replay/storage";

/**
 * DELETE /api/sites/[site]/visitors/[visitorId] - GDPR erasure (docs/redesign/07).
 *
 * Permanently deletes every event, session, and profile row for one identity
 * (the profile key: a user_id, or a visitor_id). Owner-only: the site is
 * resolved as the signed-in user via RLS, so foreign sites 404. Deletes run
 * with the admin client (analytics tables are service_role-only for writes).
 *
 * Session recordings (docs/redesign/24) are part of the erasure surface: any
 * replay_recordings row for this identity is deleted, including its stored
 * chunk objects, before the events/sessions/profiles sweep below.
 */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ site: string; visitorId: string }> },
) {
  const { site: publicId, visitorId } = await ctx.params;
  const key = decodeURIComponent(visitorId);
  if (!key) return NextResponse.json({ error: "Missing visitor" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: site } = await supabase
    .from("sites")
    .select("id")
    .eq("public_id", publicId)
    .maybeSingle();
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = createAdminClient();

  // Resolve the visitor ids that make up this profile (a user_id may span many).
  const [byUser, byVisitor] = await Promise.all([
    admin.from("sessions").select("visitor_id").eq("site_id", site.id).eq("user_id", key),
    admin.from("sessions").select("visitor_id").eq("site_id", site.id).eq("visitor_id", key),
  ]);
  const vids = Array.from(
    new Set([
      ...(byUser.data ?? []).map((r) => r.visitor_id as string),
      ...(byVisitor.data ?? []).map((r) => r.visitor_id as string),
      key, // covers a profile row that exists without sessions
    ]),
  );

  // Recordings first: their chunk objects live in the replay store, which is
  // not covered by the table deletes below, and erasure must be complete.
  const { data: recordings } = await admin
    .from("replay_recordings")
    .select("id")
    .eq("site_id", site.id)
    .in("visitor_id", vids);
  const recordingIds = (recordings ?? []).map((r) => r.id as string);

  if (recordingIds.length > 0) {
    const { data: chunks } = await admin
      .from("replay_chunks")
      .select("storage_path")
      .in("recording_id", recordingIds);
    const paths = (chunks ?? []).map((c) => c.storage_path as string);

    if (paths.length > 0 && replayStorageConfigured()) {
      try {
        await deleteReplayObjects(paths);
      } catch (err) {
        console.error(
          "[gdpr-delete] replay storage failed:",
          err instanceof Error ? err.message : err,
        );
        return NextResponse.json({ error: "Delete failed" }, { status: 500 });
      }
    }

    const { error } = await admin.from("replay_recordings").delete().in("id", recordingIds);
    if (error) {
      console.error("[gdpr-delete] recordings failed:", error.message);
      return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
  }

  // Order: events -> sessions -> profiles. Non-atomic across tables, but a
  // re-run is idempotent, and erasure completeness is what matters here.
  for (const table of ["events", "sessions", "profiles"] as const) {
    const { error } = await admin.from(table).delete().eq("site_id", site.id).in("visitor_id", vids);
    if (error) {
      console.error(`[gdpr-delete] ${table} failed:`, error.message);
      return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, visitors: vids.length, recordings: recordingIds.length });
}
