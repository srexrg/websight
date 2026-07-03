# 02 - Ingestion Pipeline & Data Model

> **Context**: Today `POST /api/track` (`app/api/track/route.ts`) validates only `session_start`/`pageview`, parses UA with `ua-parser-js`, reads geo from CDN headers, writes to three Supabase tables (`visits`, `page_views`, `daily_stats`) where `daily_stats` is updated by a non-atomic read-modify-write per request. Custom events go to a separate `events` table via `POST /api/events` (Bearer = `users.api`). Tenancy key is the raw domain string. Queries live in `lib/actions/analytics.ts` (7 parallel queries + 3 Supabase RPCs: `get_device_stats`, `get_country_stats`, `get_os_stats` - defined in Supabase, not in repo). CORS is `Access-Control-Allow-Origin: *`.

## Overview

Replace the fragmented `visits`/`page_views`/`events` trio with a single wide `events` table plus server-side sessionization and atomic incremental rollups, behind one query module. This is the pattern Rybbit validates at scale with ClickHouse (Next.js + Fastify + ClickHouse + Postgres); WebSight stays on Supabase Postgres for now but isolates every analytics read behind `lib/analytics/queries.ts` so the storage engine can be swapped for ClickHouse later without touching UI code. Every downstream plan (04-21) reads from this layer.

## Feature breakdown

- **Unified `events` table**: one row per event (`pageview`, custom, `outbound_click`, `download`, `form_submit`, `web_vital`, `error`) with denormalized session/visitor/geo/device columns - the "wide fat table" analytics pattern.
- **Server-side sessionization**: session = same visitor hash with < 30 min gap (industry standard). Client no longer owns session ids. Enables bounce rate, duration, entry/exit pages, pages-per-visit - all currently impossible.
- **Visitor identity service**: stateless mode = `hash(daily_salt + site + ip + ua)` with salt rotated and destroyed every 24h, raw IP/UA never stored (verified Plausible architecture); persistent mode = client `vid`. Both produce the same `visitor_id` column.
- **Enrichment**: UA parse (device/browser/OS + versions), geo (country/region/city - Rybbit does 3-level location; CDN headers give country + region + city on Vercel/Cloudflare), referrer parsing into channel groups (Direct/Organic Search/Social/Referral/Email/Paid - use a referrer list), UTM capture, bot filtering (UA regex list + headless signals; Rybbit was criticized for weak bot filtering vs Umami).
- **Atomic rollups**: per-site hourly/daily aggregate tables maintained by Postgres upserts (`INSERT ... ON CONFLICT ... DO UPDATE SET x = x + EXCLUDED.x`) - fixes the `daily_stats` race.
- **Sites registry**: promote `domains` to `sites` with a public `site_id` (short random id), settings JSON, and org ownership (see `16`). Tracking keyed by `site_id`, not raw domain (allows domain changes, staging sites, multiple domains per site).
- **Ingestion hardening**: origin/domain allowlist per site (replaces `*` CORS for reads; keep permissive CORS on `/api/track` since analytics beacons must accept cross-origin, but validate payload `site` against registered domains), payload size caps, per-site rate limiting.

## UI/UX considerations

None user-facing directly, but this layer determines dashboard latency: every breakdown card in `04` must answer in < 300ms at 1M events/site/month. Aggregates serve the overview; raw `events` serves filtered/segmented queries and sessions.

## Technical approach

- Keep Supabase Postgres. Partition `events` by month (`PARTITION BY RANGE (created_at)`), BRIN index on `created_at`, btree on `(site_id, created_at)`, GIN on `props`.
- Sessionization at read time is expensive; do it at write time: on each event, look up the visitor's open session in a small `sessions` table (`last_event_at > now() - 30 min`), else create one; update `sessions` counters atomically. A single RPC (`ingest_event`) wraps insert + session upsert + rollup upsert in one transaction - one round trip per batch.
- Salt rotation: `pg_cron` job writes a new random salt daily into a `salts` table and deletes yesterday's; hashing happens in the API route (Node `crypto`), salt cached in-memory 5 min.
- Query module `lib/analytics/queries.ts` exposes typed functions (`getOverview`, `getTimeseries`, `getBreakdown(dimension, filters)`, `getSessions`, ...) that all accept `{siteId, range, filters, granularity}` - the only file the UI imports. Drop the three Supabase RPCs into repo-managed SQL migrations (create `supabase/migrations/` - RPC definitions currently live only in the Supabase dashboard, which is untracked infrastructure).

## Frontend implementation

- None. `lib/actions/analytics.ts` is rewritten to delegate to `lib/analytics/queries.ts`; `fetchEnhancedAnalytics` kept as a thin adapter until `04` replaces its consumers.

## Backend implementation

- `app/api/track/route.ts` v2: accept single/array payloads from the new tracker (see `01`), validate `site` against `sites`, drop events for unregistered domains, enrich (UA, geo, channel, bot check), compute visitor hash, call `ingest_event` RPC per batch. Remove the console.log noise; add structured logging behind `DEBUG_TRACKING` env.
- `app/api/events/route.ts`: keep for backward compat, internally writes a custom event into `events` (see `14` for the v2 event API).
- Migration/backfill script: copy `page_views` + `visits` + `events` into the new `events` table (best-effort session reconstruction from stored `session_id`), keep old tables read-only for 30 days.

## Database changes

```sql
sites(id uuid pk, org_id uuid, public_id text unique, name text, domains text[],
      privacy_mode text default 'stateless', settings jsonb, created_at, timezone text default 'UTC')
salts(day date pk, salt bytea)
events(id bigint identity, site_id uuid, name text, visitor_id text, session_id uuid,
       path text, url_query jsonb, title text, referrer text, referrer_domain text, channel text,
       utm_source text, utm_medium text, utm_campaign text, utm_term text, utm_content text,
       device_type text, browser text, browser_version text, os text, os_version text,
       country char(2), region text, city text, lang text, screen_w int, screen_h int,
       user_id text, props jsonb, created_at timestamptz) PARTITION BY RANGE (created_at)
sessions(id uuid pk, site_id uuid, visitor_id text, started_at timestamptz, last_event_at timestamptz,
         entry_path text, exit_path text, pageviews int, events int, duration_s int generated,
         referrer_domain text, channel text, country char(2), region text, city text,
         device_type text, browser text, os text, utm_source text, utm_medium text, utm_campaign text,
         user_id text, is_bounce bool generated (pageviews = 1))
rollup_daily(site_id, date, pageviews, sessions, visitors_hll, bounces, duration_s_sum, ...)
  pk (site_id, date)  -- visitors via HLL sketch or approximate distinct on events for exactness
```
Note on uniques in rollups: unique visitors are not summable; either store an HLL sketch (`postgresql-hll` if available on Supabase) or compute uniques from `events`/`sessions` at query time and use rollups only for summable metrics.

## API requirements

- `POST /api/track` (public, batch, 202), `OPTIONS` preflight.
- Internal RPCs: `ingest_event(jsonb[])`; all analytics reads via `lib/analytics/queries.ts` server-side (no public read API yet - that is `19`).

## Dependencies

- `ua-parser-js` (already present), a referrer/channel list (port of snowplow referer-parser YAML, vendored), bot UA list (vendored from `isbot`), `pg_cron` (available on Supabase).

## Edge cases

- Clock skew: trust server time, ignore client `ts` except for ordering within a batch.
- Session race on concurrent first events (two tabs): unique partial index on open sessions per visitor + `ON CONFLICT` retry.
- Visitors crossing midnight in stateless mode become new visitors (accepted Plausible trade-off; document it).
- Partition maintenance: `pg_cron` creates next month's partition ahead of time; alert if missing.
- Replayed/duplicated beacons (retries): dedupe by `(site_id, visitor_id, name, path, ts)` within a 5s window, best effort.
- GDPR deletion: stateless mode stores no personal identifiers; persistent mode needs a `DELETE` path by `visitor_id`/`user_id` (admin endpoint).

## Development milestones

1. Migrations for `sites`/`events`/`sessions`/`salts`/rollups + `supabase/migrations` scaffolding; dual-write from current `/api/track`.
2. `ingest_event` RPC, sessionization, salt rotation, enrichment (channel, bot, geo 3-level).
3. `lib/analytics/queries.ts` with overview/timeseries/breakdown reads hitting new tables; parity check against old numbers.
4. Backfill script + cut reads over; retire `visits`/`page_views`/`daily_stats` writes.
5. Rate limiting + origin validation + monitoring.

## Future improvements

- ClickHouse (or DuckDB/MotherDuck) as a drop-in behind `queries.ts` when Postgres aggregation latency degrades (>10M events/mo); Kafka-style buffering only if ingestion volume demands it (PostHog pattern); server-side `POST /api/track` auth tokens for backend event sources.
