# 24 - Session Replay

> **Context**: WebSight has no replay capability. After `01` the tracker is a sub-3KB core with lazy extension chunks (vitals `12`, errors `13`); after `02` sessions are first-class server-side rows; after `07` the dashboard has a Sessions screen with an event-timeline drawer. Rybbit's verified feature set includes session replay with 30-day retention (a paid-tier differentiator on its cloud). PostHog's verified replay architecture - rrweb full + incremental DOM snapshots, blob storage (S3) for payloads with metadata in the analytics DB, TTL-based retention - was flagged in `00` as "the pattern to follow if/when replay ships". This is that plan. Plausible deliberately does not ship replay; it is the one feature in this redesign that genuinely records user behavior, so privacy posture is a first-class requirement, not a footnote.

## Overview

Record real user sessions as rrweb DOM snapshot streams, store the payloads in an S3-compatible object store (Cloudflare R2 on cloud - zero egress fees; any S3 endpoint when self-hosting) with metadata rows joined to the `02` `sessions` table, and play them back inside the `07` session detail drawer and a dedicated Replays screen. Replay is **off by default**, opt-in per site, sampled, aggressively masked, and TTL-expired - "Rybbit-class replay with a privacy story we can defend". The recorder ships as a lazy extension chunk so the core tracker stays under its 3KB budget.

## Feature breakdown

- **Recorder extension chunk** (`public/t-r.js`): rrweb `record()` with full snapshot on start + incremental mutations, loaded only when the site has replay enabled (same flag mechanism as vitals/errors chunks in `01`). Core tracker never grows.
- **Masking by default**: all input values masked (`maskAllInputs: true`), password/email/credit-card fields always masked with no override, optional full text masking (`replay_mask_text` site setting), `data-ws-mask` / `data-ws-unmask` element attributes for page-level control. Cross-origin iframes and canvas/WebGL are not recorded in v1.
- **Sampling**: `replay_sample_rate` (0-100%) site setting; the sampling decision is made once per page load in memory and holds across SPA navigations. Recording stops at hard caps (duration, bytes, chunk count) so a runaway tab cannot blow up storage.
- **Chunked, compressed upload**: recorder batches rrweb events and flushes every ~5s or 256KB (whichever first) plus on `visibilitychange`; payloads are gzipped client-side (`CompressionStream`, fallback plain JSON) and POSTed to `/api/replay`.
- **Session linkage**: the server stamps each recording with the visitor's open session via the same lookup `ingest_event` uses (`02`), so replays appear on session rows with zero client-side session state - works in both privacy modes.
- **Playback**: rrweb-player embedded in the `07` session drawer ("Watch replay" appears on sessions that have one) and a Replays screen listing recordings (time, visitor chip, entry path, duration, device/browser, page count, size) with the standard filter bar (`05`). Player has speed controls, skip-inactive, and a pageview-marker timeline.
- **Retention & deletion**: `replay_retention_days` per site (default 30, Rybbit parity); expiry deletes both metadata and storage objects. GDPR visitor deletion (`07`) cascades to recordings. Site owners can delete any single recording from the player.
- **Consent honesty**: enabling replay shows an explicit dialog stating that DOM recording may require user consent under GDPR/ePrivacy even though WebSight's core analytics does not - with a link to docs and the masking settings. The "no consent banner needed" claim on the landing page must never be attached to replay.

## UI/UX considerations

- Replays screen matches the Sessions screen density and iconography; a filmstrip-style hover preview is out of scope for v1.
- Player page: dark chrome around the viewport (the recorded page supplies its own colors), JetBrains Mono timestamps, emerald progress bar; sidebar shows the session's event timeline (`07`) synced to playhead - clicking a pageview seeks the player.
- Sessions list rows get a small play icon when a recording exists; the drawer's header gains a "Watch replay" button.
- States: replay disabled (explainer + enable CTA for owners), enabled-but-no-recordings ("waiting for sampled sessions"), recording expired (tombstone row explaining retention), player loading skeleton, chunk-fetch error with retry.
- Settings card (site settings, `03` shell): enable toggle, sample rate slider, text masking toggle, retention picker, live estimate of monthly storage from current traffic.

## Technical approach

- **Recording**: rrweb is ~35KB gzipped - acceptable only as a lazy chunk. `packages/tracker/src/replay.ts` builds to `public/t-r.js`; core loads it via dynamic import when the config flag says so. Recorder assigns a random `recording_id` (UUID) per page load and resumes appending chunks to it across SPA routes; a full snapshot is re-taken when rrweb signals checkout (every 2min) to bound chunk replay cost.
- **Storage**: private bucket `replays` on an **S3-compatible object store**, object path `{site_id}/{recording_id}/{seq}.json.gz`. Metadata in Postgres: one `replay_recordings` row per recording, one `replay_chunks` row per object. The storage layer is written against the S3 protocol (presigned URLs, PutObject/DeleteObjects), never a vendor SDK - cloud default is **Cloudflare R2** (zero egress fees, ~10GB-month + 1M writes/10M reads free, then $0.015/GB-month; egress matters because playback re-downloads everything that was ingested), while self-hosters point the same config at MinIO, AWS S3, or Supabase Storage's S3 endpoint. This is a deliberate, recorded amendment to the `23` "no new vendors" posture: `23` governs the events database; blob storage economics are a different problem, and the S3 interface keeps the vendor swappable. Config: `REPLAY_S3_ENDPOINT`, `REPLAY_S3_BUCKET`, `REPLAY_S3_ACCESS_KEY_ID`, `REPLAY_S3_SECRET_ACCESS_KEY`, `REPLAY_S3_REGION` (`auto` for R2).
- **Ingest**: `POST /api/replay` validates the site (same registry + origin rules as `/api/track` in `02`), enforces per-site quotas and per-request size cap (5MB), decompresses headers only (payload stored as-is), upserts the recording row, resolves `session_id` from the visitor's open session, uploads the object to the S3 bucket, returns 202.
- **Playback**: server action issues short-lived S3 presigned GET URLs for a recording's chunks in order; the player fetches, decompresses, and feeds rrweb-player. No replay payload ever flows through PostgREST or the Next.js server (R2's free egress makes direct-to-browser the cheap path too).
- **Expiry**: `expires_at` stamped at ingest from site settings. A daily job (Vercel cron hitting an internal route - pg_cron cannot delete S3 objects) issues batched `DeleteObjects` calls then removes metadata rows, oldest first, with a batch cap.

## Frontend implementation

- `packages/tracker/src/replay.ts` (recorder chunk); size-limit gate for the chunk itself (< 45KB gzipped) separate from the core budget.
- `app/(app)/[site]/(dashboard)/replays/page.tsx` + `.../replays/[recordingId]/page.tsx`; `components/dashboard/replays/{replay-row,player,player-timeline}.tsx`; "Watch replay" wiring in `components/dashboard/sessions/session-drawer.tsx` (`07`).
- Settings card in the site settings screen; consent dialog on first enable.

## Backend implementation

- `app/api/replay/route.ts` (public beacon endpoint, CORS per `02`, 202 responses).
- `lib/analytics/replay.ts`: recording upsert, chunk registration, presigned-URL issuance, quota checks - the only module that touches the object store (S3 signing via `aws4fetch`; swapping providers is a config change, not a code change).
- Retention route `app/api/internal/replay-expiry/route.ts` guarded by `CRON_SECRET`; GDPR delete path from `07` extended to call replay deletion.
- `lib/analytics/queries.ts` gains `getReplays(params, cursor)` and `getReplay(recordingId)`.

## Database changes

```sql
replay_recordings(id uuid pk, site_id uuid, session_id uuid, visitor_id text,
                  started_at timestamptz, last_activity_at timestamptz,
                  duration_s int, page_count int, chunk_count int, bytes bigint,
                  entry_path text, device_type text, browser text, os text, country char(2),
                  status text check (status in ('active','complete','expired')),
                  expires_at timestamptz, created_at timestamptz)
  index (site_id, started_at desc); index (session_id); index (expires_at) where status <> 'expired'
replay_chunks(recording_id uuid, seq int, storage_path text, bytes int,
              started_at timestamptz, ended_at timestamptz, pk (recording_id, seq))
-- sites.settings jsonb additions: replay_enabled, replay_sample_rate,
-- replay_mask_text, replay_retention_days (no schema change; document keys in 02's site settings)
```

RLS on both tables, service-role access only (same posture as `events`/`sessions` in `02`).

## API requirements

- `POST /api/replay` - public, gzip payload, 202; `OPTIONS` preflight.
- Signed playback URLs via server action only (no public GET).
- Internal: `POST /api/internal/replay-expiry` (cron).

## Dependencies

- `rrweb` + `rrweb-player` (recorder chunk and dashboard player only - never in the core tracker bundle), `fflate` only if the `CompressionStream` fallback proves necessary. `aws4fetch` (~6KB, edge-compatible) for S3 request signing - deliberately not the AWS SDK. A Cloudflare account with an R2 bucket + API token for cloud; any S3-compatible endpoint otherwise. Builds on `01` (extension chunks), `02` (sites registry, sessionization, origin rules), `05` (filters), `07` (sessions UI). Billing caps land with `18`.

## Edge cases

- `sendBeacon` 64KB limit: replay chunks always use `fetch(keepalive)` with explicit size handling, never beacon.
- Tab killed mid-chunk: accept the loss; recording is marked `complete` by the expiry job when `last_activity_at` is stale (> 1h), not by a client signal.
- Hard caps per recording: 60 min duration, 10MB compressed, 500 chunks - recorder stops silently, row keeps `status='complete'`.
- Session boundary vs recording boundary: a recording can span two server sessions (30-min idle gap in one tab) - link chunks to the session open at chunk-arrival time; the player renders a session-change marker.
- Mutation storms (animated dashboards, canvas apps): rrweb sampling options (`mutation` throttle) + the byte cap; document known-noisy patterns.
- Stateless mode midnight rollover (`02`): visitor hash changes, session lookup misses - recording continues under the same `recording_id` with the new session stamped; acceptable.
- Storage failures must never break tracking: `/api/replay` errors are swallowed client-side, core analytics is unaffected.
- Self-hosted without an S3 endpoint configured: feature hides behind a capability check (`REPLAY_S3_*` env presence), settings card explains the requirement and lists known-good providers (R2, MinIO, S3, Supabase Storage S3 endpoint).

## Development milestones

1. Schema + S3 storage module (`aws4fetch` signing, R2 bucket provisioned, `REPLAY_S3_*` env) + `POST /api/replay` storing compressed chunks with recording/session linkage; feature flag in site settings (no UI yet); quotas + size caps.
2. Recorder chunk: rrweb capture, masking defaults, sampling, batching/compression, SPA continuity; size gate; verified end-to-end against a local site.
3. Playback: signed URLs, rrweb-player page, Replays list + session-drawer entry point, empty/error/expired states.
4. Retention cron + GDPR cascade + per-recording delete; consent dialog + settings card + docs page.
5. Polish: pageview-marker timeline sync, skip-inactive, storage usage estimate in settings; `18` billing caps when billing lands.

## Future improvements

- Console log + network request capture as optional rrweb plugins (PostHog parity); filmstrip hover previews; rage-click/dead-click detection feeding `20` AI insights; heatmaps derived from replay mouse data; replay links in `13` error detail (jump to the moment of the error); lifecycle rules pushed down to the store (R2 object lifecycle policies) so expiry needs no application cron.
