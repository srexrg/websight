import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadEnvLocal } from "@/lib/env-local";
import {
  REPLAY_SETTING_DEFAULTS,
  replaySettingsFrom,
} from "@/lib/replay/types";
import {
  deleteReplayObjects,
  presignReplayGet,
  putReplayObject,
  replayObjectPath,
  replayStorageConfigured,
} from "@/lib/replay/storage";

// Load .env.local for the live round-trip, same as the integration tests.
loadEnvLocal();
const CONFIGURED = replayStorageConfigured();

const S3_KEYS = [
  "REPLAY_S3_ENDPOINT",
  "REPLAY_S3_BUCKET",
  "REPLAY_S3_ACCESS_KEY_ID",
  "REPLAY_S3_SECRET_ACCESS_KEY",
  "REPLAY_S3_REGION",
] as const;

function saveEnv(): Record<string, string | undefined> {
  const saved: Record<string, string | undefined> = {};
  for (const k of S3_KEYS) saved[k] = process.env[k];
  return saved;
}

function restoreEnv(saved: Record<string, string | undefined>): void {
  for (const k of S3_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
}

describe("replaySettingsFrom", () => {
  it("returns defaults for undefined / null / garbage", () => {
    expect(replaySettingsFrom(undefined)).toEqual(REPLAY_SETTING_DEFAULTS);
    expect(replaySettingsFrom(null)).toEqual(REPLAY_SETTING_DEFAULTS);
    expect(replaySettingsFrom("nope")).toEqual(REPLAY_SETTING_DEFAULTS);
    expect(replaySettingsFrom(42)).toEqual(REPLAY_SETTING_DEFAULTS);
    expect(replaySettingsFrom({})).toEqual(REPLAY_SETTING_DEFAULTS);
  });

  it("parses a full settings object", () => {
    expect(
      replaySettingsFrom({
        replay_enabled: true,
        replay_sample_rate: 0.25,
        replay_mask_text: true,
        replay_retention_days: 14,
        replay_daily_cap_mb: 500,
        other_key: "ignored",
      }),
    ).toEqual({
      enabled: true,
      sampleRate: 0.25,
      maskText: true,
      retentionDays: 14,
      dailyCapMb: 500,
    });
  });

  it("coerces string-typed jsonb values", () => {
    expect(
      replaySettingsFrom({
        replay_enabled: "true",
        replay_sample_rate: "0.5",
        replay_mask_text: "false",
        replay_retention_days: "60",
        replay_daily_cap_mb: "1024",
      }),
    ).toEqual({
      enabled: true,
      sampleRate: 0.5,
      maskText: false,
      retentionDays: 60,
      dailyCapMb: 1024,
    });
  });

  it("clamps out-of-range values", () => {
    const high = replaySettingsFrom({
      replay_sample_rate: 5,
      replay_retention_days: 9999,
      replay_daily_cap_mb: 999999,
    });
    expect(high.sampleRate).toBe(1);
    expect(high.retentionDays).toBe(365);
    expect(high.dailyCapMb).toBe(10240);

    const low = replaySettingsFrom({
      replay_sample_rate: -3,
      replay_retention_days: 0,
      replay_daily_cap_mb: 1,
    });
    expect(low.sampleRate).toBe(0);
    expect(low.retentionDays).toBe(1);
    expect(low.dailyCapMb).toBe(10);
  });

  it("falls back per-field on invalid values", () => {
    expect(
      replaySettingsFrom({
        replay_enabled: "maybe",
        replay_sample_rate: "abc",
        replay_retention_days: null,
      }),
    ).toEqual(REPLAY_SETTING_DEFAULTS);
  });
});

describe("replayObjectPath", () => {
  it("builds the plain key without gz", () => {
    expect(replayObjectPath("site-1", "rec-2", 3, false)).toBe(
      "site-1/rec-2/3.json",
    );
  });

  it("appends .gz when compressed", () => {
    expect(replayObjectPath("site-1", "rec-2", 3, true)).toBe(
      "site-1/rec-2/3.json.gz",
    );
  });
});

describe("replayStorageConfigured", () => {
  const saved = saveEnv();
  afterEach(() => restoreEnv(saved));

  it("is false when any env var is missing", () => {
    delete process.env.REPLAY_S3_ENDPOINT;
    expect(replayStorageConfigured()).toBe(false);
  });

  it("is true when all five env vars are present", () => {
    for (const k of S3_KEYS) process.env[k] = "x";
    expect(replayStorageConfigured()).toBe(true);
  });
});

describe("presignReplayGet", () => {
  const saved = saveEnv();
  beforeEach(() => {
    process.env.REPLAY_S3_ENDPOINT = "https://acct.r2.cloudflarestorage.com";
    process.env.REPLAY_S3_BUCKET = "replays";
    process.env.REPLAY_S3_ACCESS_KEY_ID = "AKIDEXAMPLE";
    process.env.REPLAY_S3_SECRET_ACCESS_KEY = "SECRETEXAMPLE";
    process.env.REPLAY_S3_REGION = "auto";
  });
  afterEach(() => restoreEnv(saved));

  it("returns a query-signed URL honoring the expiry (pure computation)", async () => {
    const url = await presignReplayGet("site-1/rec-2/0.json.gz", 600);
    expect(url).toContain("https://acct.r2.cloudflarestorage.com/replays/");
    expect(url).toContain("X-Amz-Expires=600");
    expect(url).toContain("X-Amz-Signature=");
    expect(url).toContain("X-Amz-Algorithm=AWS4-HMAC-SHA256");
  });

  it("defaults the expiry to 600 seconds", async () => {
    const url = await presignReplayGet("site-1/rec-2/0.json");
    expect(url).toContain("X-Amz-Expires=600");
  });
});

describe.skipIf(!CONFIGURED)("live S3 round-trip", () => {
  it("put -> presign -> fetch -> delete -> 404", async () => {
    const key = `_test/${Date.now()}-${Math.random().toString(36).slice(2)}.json`;
    const payload = new TextEncoder().encode(
      JSON.stringify({ hello: "replay", ts: Date.now() }),
    );

    await putReplayObject(key, payload);

    const getUrl = await presignReplayGet(key, 600);
    const got = await fetch(getUrl);
    expect(got.status).toBe(200);
    const bytes = new Uint8Array(await got.arrayBuffer());
    expect(bytes).toEqual(payload);

    await deleteReplayObjects([key]);

    const gone = await fetch(await presignReplayGet(key, 600));
    expect(gone.status).toBe(404);
  });

  it("deleteReplayObjects([]) is a no-op", async () => {
    await expect(deleteReplayObjects([])).resolves.toBeUndefined();
  });

  // Sequential puts of varying sizes on a reused connection - the pattern that
  // flushed out 411 MissingContentLength when bodies were sent chunked.
  it("survives a burst of 8 sequential puts (100B..200KB)", async () => {
    const prefix = `_test/${Date.now()}-burst-${Math.random().toString(36).slice(2)}`;
    const sizes = [100, 1_000, 5_000, 20_000, 50_000, 100_000, 150_000, 200_000];
    const keys = sizes.map((_, i) => `${prefix}/${i}.json`);

    try {
      for (let i = 0; i < sizes.length; i++) {
        const body = new Uint8Array(sizes[i]).fill(i + 1);
        await putReplayObject(keys[i], body);
      }
      // Spot-check the largest object landed intact.
      const got = await fetch(await presignReplayGet(keys[keys.length - 1], 600));
      expect(got.status).toBe(200);
      const bytes = new Uint8Array(await got.arrayBuffer());
      expect(bytes.length).toBe(sizes[sizes.length - 1]);
      expect(bytes[0]).toBe(sizes.length);
    } finally {
      await deleteReplayObjects(keys);
    }
  });
});
