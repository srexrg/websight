/**
 * Shared session-replay types and the site-settings parser (docs/redesign/24).
 *
 * Replay config lives in the `sites.settings` jsonb (no schema change, per 24's
 * database notes): keys replay_enabled, replay_sample_rate, replay_mask_text,
 * replay_retention_days, replay_daily_cap_mb. Every consumer - the tracker
 * config endpoint, the /api/replay ingest, the expiry cron - reads it through
 * replaySettingsFrom() so the defaults and clamps live in exactly one place.
 * Replay is off by default; a missing or malformed settings blob yields the
 * safe defaults below.
 */

/** The subset of settings the tracker needs to decide whether/how to record. */
export type ReplayConfig = { on: boolean; sample: number; maskText: boolean };

export type ReplaySettings = {
  enabled: boolean;
  sampleRate: number; // 0..1, default 1
  maskText: boolean;
  retentionDays: number; // default 30
  dailyCapMb: number; // per-site ingest cap over trailing 24h, default 200
};

export const REPLAY_SETTING_DEFAULTS: ReplaySettings = {
  enabled: false,
  sampleRate: 1,
  maskText: false,
  retentionDays: 30,
  dailyCapMb: 200,
};

function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}

/** Coerce an unknown jsonb value to a finite number, or null if it is not one. */
function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function bool(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

/**
 * Parse sites.settings jsonb keys replay_enabled, replay_sample_rate,
 * replay_mask_text, replay_retention_days, replay_daily_cap_mb.
 * Missing/invalid values fall back to defaults; sampleRate clamped 0..1,
 * retentionDays clamped 1..365, dailyCapMb clamped 10..10240.
 */
export function replaySettingsFrom(settings: unknown): ReplaySettings {
  const d = REPLAY_SETTING_DEFAULTS;
  if (settings === null || typeof settings !== "object") return { ...d };
  const s = settings as Record<string, unknown>;

  const enabled = bool(s.replay_enabled) ?? d.enabled;
  const maskText = bool(s.replay_mask_text) ?? d.maskText;

  const rawSample = num(s.replay_sample_rate);
  const sampleRate = rawSample === null ? d.sampleRate : clamp(rawSample, 0, 1);

  const rawRetention = num(s.replay_retention_days);
  const retentionDays =
    rawRetention === null ? d.retentionDays : clamp(Math.round(rawRetention), 1, 365);

  const rawCap = num(s.replay_daily_cap_mb);
  const dailyCapMb =
    rawCap === null ? d.dailyCapMb : clamp(Math.round(rawCap), 10, 10240);

  return { enabled, sampleRate, maskText, retentionDays, dailyCapMb };
}
