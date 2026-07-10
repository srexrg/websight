/**
 * One-shot bucket CORS for session replay (docs/redesign/24).
 *
 * The player fetches replay chunks straight from the object store via presigned
 * GET URLs, so the bucket must allow cross-origin GET/HEAD from the dashboard
 * origins. Run this once per bucket when provisioning R2 (or any S3 endpoint).
 *
 * Run: npx tsx scripts/replay-cors.mts [origin ...]
 * Defaults to http://localhost:3000 and https://websight.srexrg.me.
 */
import { loadEnvLocal } from "../lib/env-local";
import { putReplayBucketCors, replayStorageConfigured } from "../lib/replay/storage";

loadEnvLocal();

const DEFAULT_ORIGINS = ["http://localhost:3000", "https://websight.srexrg.me"];

async function main() {
  if (!replayStorageConfigured()) {
    throw new Error(
      "replay storage not configured - set REPLAY_S3_ENDPOINT, REPLAY_S3_BUCKET, " +
        "REPLAY_S3_ACCESS_KEY_ID, REPLAY_S3_SECRET_ACCESS_KEY, REPLAY_S3_REGION in .env.local",
    );
  }
  const origins = process.argv.slice(2);
  const applied = origins.length > 0 ? origins : DEFAULT_ORIGINS;
  await putReplayBucketCors(applied);
  console.log("Applied replay bucket CORS for origins:");
  for (const o of applied) console.log("  " + o);
}

main().catch((e) => {
  console.error("REPLAY CORS FAILED:", e instanceof Error ? e.message : e);
  process.exit(1);
});
