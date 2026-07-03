# 19 - Reports, Exports & Data API

> **Context**: Today's only export is a jsPDF dump (`ExportButton.tsx` -> `lib/utils/exportToPdf.ts`); the only API surface is ingestion. Research: Rybbit cloud verifies automated email reports (daily/weekly/monthly), data export, and "full API access for custom queries"; Sleek verifies weekly digest reports and a public Data API; Plausible's API is deliberately scoped to event capture + aggregate queries (a good complexity ceiling). Email infra (`lib/email/`) comes from `16`; site API keys are introduced here and consumed by `14`'s server events.

## Overview

Three ways to get data out: scheduled email digests (retention driver - the product that emails you keeps you), CSV/JSON exports everywhere, and a read API for programmatic access. Scope the API to aggregate queries (Plausible's ceiling) - a full query language is explicitly out.

## Feature breakdown

- **Email digests**: per-site subscriptions (any org member opts themselves in): weekly (default, Monday morning site-timezone) / daily / monthly. Content: period metrics vs previous (visitors, pageviews, bounce, duration), top 5 pages/sources/countries, goal conversions, one headline delta ("Traffic up 23% - driven by Reddit") - readable in 15 seconds on a phone. Plain, beautiful, brand-emerald HTML (React Email).
- **CSV export**: every BreakdownCard details modal (`04`), sessions list (`07`), goals/funnels/retention results - one shared "Export CSV" affordance; server-generated (streaming) with the active filters applied; filename convention `websight-{site}-{report}-{range}.csv`. Retire the jsPDF export (PDF of a dashboard is worse than the shareable link from `15`).
- **Full data export**: org-level "export all raw events" (NDJSON, ranged) for GDPR portability and self-host migration - the data-ownership promise made on the landing page, delivered.
- **Read API v1** (`Bearer` site API key):
  - `GET /api/v1/sites/:id/aggregate?metrics=visitors,pageviews&range=&f=` - the six core metrics.
  - `GET /api/v1/sites/:id/timeseries?metric=&granularity=&range=&f=`
  - `GET /api/v1/sites/:id/breakdown?dimension=&range=&f=&limit=`
  - Filters use the `05` URL codec; responses versioned envelope `{data, meta:{range, filters, generatedAt}}`.
- **API key management** (replaces today's single per-user `users.api` key): site-scoped keys with label, prefix-display (`ws_live_ab12...`), scopes (`events:write` for `14`, `stats:read`), last-used timestamp, revocation. Settings screen section.
- **Webhooks (v1.5)**: per-site endpoints for goal completions and error-group regressions (`13`) - signature-signed payloads.

## UI/UX considerations

- Digest email is a marketing surface: footer links to the dashboard and (on Hobby) a subtle powered-by; unsubscribe one-click per CAN-SPAM/GDPR; preview button in settings sends yourself one now.
- Key creation shows the secret exactly once (copy-to-close pattern); the settings list shows prefix + last-used so dead keys are obvious.
- Exports over ~50k rows run async: toast "we'll email you a download link" (link expires 24h) rather than a hanging request.
- API docs page (`/docs/api`) with curl examples per endpoint, generated from one source of truth (typed route definitions).

## Technical approach

- Scheduling: Vercel Cron (or `pg_cron` + queue table) hourly tick -> due subscriptions by timezone -> render React Email with data from `lib/analytics/queries.ts` -> Resend batch send; idempotency via `(subscription_id, period)` sent-log.
- CSV: route handlers streaming `text/csv` from cursored queries (reuse `07` pagination); async path uploads to Supabase Storage + emails signed URL.
- API auth middleware: hash-lookup of key (store SHA-256, index by prefix), scope check, per-key rate limit (60 req/min), usage stamped async.
- Rate/complexity guards on the read API: range capped at 13 months, breakdown limit <= 1000 rows.

## Frontend implementation

- Settings: `components/settings/{report-subscriptions,api-keys}.tsx`; export affordances added to shared components (`BreakdownCard` details modal, list toolbars); email templates in `emails/{digest,export-ready,limit-warning}.tsx` (React Email; also serves `16` invites and `18` billing mails).

## Backend implementation

- `app/api/v1/*` route handlers + `lib/api/auth.ts` (key resolution, scopes, rate limit); digest job `app/api/cron/digests/route.ts` (cron-secret protected); export jobs; `SettingsClient` API-key section rewrite (fixing the existing `.update([{...}])` array-arg bug by replacing the whole flow).

## Database changes

```sql
site_api_keys(id uuid pk, site_id uuid, label text, key_prefix text, key_hash text unique,
              scopes text[], last_used_at timestamptz, created_by uuid, created_at, revoked_at)
report_subscriptions(id uuid pk, site_id uuid, user_id uuid, cadence text
                     check (cadence in ('daily','weekly','monthly')), created_at,
                     unique (site_id, user_id, cadence))
report_send_log(subscription_id uuid, period date, sent_at, pk (subscription_id, period))
```
Deprecate `users.api` (migrate existing keys into `site_api_keys` with `events:write` scope for each of the user's sites).

## API requirements

- Read API v1 endpoints above; key CRUD `GET/POST/DELETE /api/sites/:id/keys`; subscriptions CRUD; cron endpoints; async-export status endpoint.

## Dependencies

- `resend`, `@react-email/components` (shared with `16`), Vercel Cron config. Requires `02` (queries), `04` (metrics), `05` (filter codec).

## Edge cases

- Digest for a site with zero traffic (send a light "quiet week" version at most monthly, else skip - don't train users to ignore); timezone-shifted Mondays (schedule by site timezone, dedupe by period key); Resend failures (retry 3x, log, surface in settings); key leaked (revoke + rotate flow, last-used aids detection); CSV injection (`=`, `+`, `-`, `@` prefixed cells escaped - real vulnerability class); concurrent async exports per org capped at 2; API keys used from browsers (CORS deny on `/api/v1` - server-side only, documented).

## Development milestones

1. Site API keys (schema, CRUD UI, migration off `users.api`).
2. Read API v1 (aggregate/timeseries/breakdown) + docs page.
3. CSV export (sync path) across breakdowns/sessions; retire PDF.
4. Email digests (subscriptions, cron, template, send-log) + preview.
5. Async exports + full raw export + webhooks.

## Future improvements

- Slack/Discord digest destinations (indie-audience fit); saved-report builder (pick cards -> scheduled email); Google Sheets connector; GraphQL or SQL-over-HTTP only if real demand (PostHog-scale complexity - resist); alerting rules engine (threshold + anomaly) unifying `05` segments, `08` goals, `12` vitals, `13` errors notifications.
