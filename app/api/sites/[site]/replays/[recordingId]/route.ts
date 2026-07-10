import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { resolveOwnedSite } from "@/lib/dashboard/site-owner";
import { deleteReplayObjects, replayStorageConfigured } from "@/lib/replay/storage";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * DELETE /api/sites/[site]/replays/[recordingId] - owner-initiated single
 * recording delete (docs/redesign/24). Owner-only via resolveOwnedSite.
 * Deletes the stored chunk objects first (manifest-then-purge, same order as
 * the expiry cron and the GDPR cascade), then the recording row (replay_chunks
 * cascade on delete).
 */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ site: string; recordingId: string }> },
) {
  const { site, recordingId } = await ctx.params;
  const owned = await resolveOwnedSite(site);
  if ("error" in owned) return owned.error;

  if (!UUID_RE.test(recordingId)) {
    return NextResponse.json({ error: "Invalid recording id" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: recording } = await admin
    .from("replay_recordings")
    .select("id")
    .eq("id", recordingId)
    .eq("site_id", owned.siteId)
    .maybeSingle();
  if (!recording) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: chunks } = await admin
    .from("replay_chunks")
    .select("storage_path")
    .eq("recording_id", recordingId);
  const paths = (chunks ?? []).map((c) => c.storage_path as string);

  if (paths.length > 0 && replayStorageConfigured()) {
    try {
      await deleteReplayObjects(paths);
    } catch (err) {
      console.error(
        "[replay-delete] storage failed:",
        err instanceof Error ? err.message : err,
      );
      return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
  }

  const { error } = await admin.from("replay_recordings").delete().eq("id", recordingId);
  if (error) {
    console.error("[replay-delete] recording failed:", error.message);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
