import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { deleteReplayObjects, replayStorageConfigured } from "@/lib/replay/storage";

/**
 * GET /api/internal/replay-expiry - daily retention sweep (docs/redesign/24).
 *
 * Run by vercel.json's cron entry, once a day. This is an HTTP route (rather
 * than a pg_cron job like the rest of the retention story) because pg_cron
 * can delete database rows but cannot delete S3 objects - only this process,
 * which holds the REPLAY_S3_* credentials, can call deleteReplayObjects().
 * Guarded by CRON_SECRET; Vercel sends it as a Bearer token automatically for
 * routes covered by a cron entry.
 *
 * Three steps, in order:
 *  1. Stale-active cleanup: a killed tab never sends a "goodbye" beacon, so
 *     any recording still "active" an hour after its last activity is closed
 *     out as "complete" (it is done, just never told us).
 *  2. Expiry sweep: recordings past their expires_at get their chunks deleted
 *     from the object store, then their storage_path rows deleted, then are
 *     marked "expired" (a tombstone - see step 3). Oldest first, capped at 10
 *     iterations of 200 rows so one run cannot run unbounded.
 *  3. Tombstone purge: "expired" rows past a 90-day grace period are deleted
 *     outright. The grace period is what lets the dashboard show an "expired"
 *     state instead of the row just vanishing.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();

  // Step 1: a killed tab never says goodbye, so close out anything that has
  // been silent for over an hour.
  const staleCutoff = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const { data: staled } = await admin
    .from("replay_recordings")
    .update({ status: "complete" })
    .eq("status", "active")
    .lt("last_activity_at", staleCutoff)
    .select("id");

  // Step 2: expiry sweep, oldest first, bounded per run.
  let expired = 0;
  let objectsDeleted = 0;
  const nowIso = now.toISOString();
  for (let i = 0; i < 10; i++) {
    const { data: batch } = await admin
      .from("replay_recordings")
      .select("id")
      .neq("status", "expired")
      .lt("expires_at", nowIso)
      .order("expires_at", { ascending: true })
      .limit(200);
    if (!batch || batch.length === 0) break;

    const ids = batch.map((r) => r.id as string);

    const { data: chunks } = await admin
      .from("replay_chunks")
      .select("storage_path")
      .in("recording_id", ids);
    const paths = (chunks ?? []).map((c) => c.storage_path as string);

    // Delete the objects BEFORE the rows: the rows are the manifest of what
    // still needs deleting, so if the store call throws, let it propagate to
    // a 500 with the manifest intact for the next run to retry.
    if (paths.length > 0 && replayStorageConfigured()) {
      await deleteReplayObjects(paths);
      objectsDeleted += paths.length;
    }

    await admin.from("replay_chunks").delete().in("recording_id", ids);
    await admin.from("replay_recordings").update({ status: "expired" }).in("id", ids);
    expired += ids.length;
  }

  // Step 3: purge tombstones past their grace period. 90 days is enough for
  // the "expired after N days" row state the dashboard shows.
  const tombstoneCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: purged } = await admin
    .from("replay_recordings")
    .delete()
    .eq("status", "expired")
    .lt("expires_at", tombstoneCutoff)
    .select("id");

  return NextResponse.json({
    staled: (staled ?? []).length,
    expired,
    objectsDeleted,
    purged: (purged ?? []).length,
  });
}
