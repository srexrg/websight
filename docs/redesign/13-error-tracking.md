# 13 - Error Tracking

> **Context**: Nothing exists today. Rybbit ships JavaScript error tracking in OSS (verified README feature). The tracker plan (`01`) reserves a lazy `errors` extension chunk; the data model (`02`) accepts `error` events with JSON props. This is lightweight frontend-error *awareness* inside analytics - not a Sentry replacement - the scope Rybbit validates.

## Overview

Capture uncaught JavaScript errors and unhandled promise rejections from real visitors, group them by fingerprint, and show frequency, affected users, pages, and browsers - connected to sessions so an error is one click from "what was the user doing". The differentiator vs standalone error tools is exactly that join: errors in the context of analytics sessions, goals, and traffic.

## Feature breakdown

- **Capture** (tracker chunk): `window.onerror` + `unhandledrejection` -> `{name:'error', props: {message, stack (trimmed), type, filename, lineno, colno, path}}`; client-side dedupe (same fingerprint max 5/session), stack capped at ~4KB, obvious extension/third-party-script errors flagged (`filename` not on site origin).
- **Errors screen**: grouped list - message + type, first/last seen, occurrences, affected visitors, trend sparkline, top browser chip; sorted by last-seen volume; status toggle per group: open / resolved / ignored (resolved groups that recur auto-reopen with a "regressed" badge - the one triage mechanic worth borrowing from Sentry).
- **Error detail**: full message + prettified stack, occurrence timeseries, breakdowns (pages, browsers + versions, OS, countries), sample occurrences list -> each links to the session timeline (`07`) where the error appears inline among pageviews/events.
- **Overview surfacing**: small "Errors (24h)" indicator on the site health area of Overview when nonzero, linking here.
- **Filter/date integration**: global filter bar applies (errors for `Channel is Paid` traffic etc.).

## UI/UX considerations

- Grouped rows lead with the human-readable message, monospace, single line with expansion; noise controls are visible (ignore button on every row) because uncurated error lists rot fast.
- Third-party errors get a muted "external script" chip and are collapsed into one group by default - the #1 noise source.
- Empty states: feature disabled -> explainer + enable toggle; enabled + zero errors -> a genuinely celebratory state ("No errors from real users in this period").
- Never render raw stacks unescaped (XSS via error message is a real vector - escape everything).

## Technical approach

- **Fingerprinting** (server-side at ingest): normalize message (strip numbers/UUIDs/URLs), take top ~3 stack frames with filenames normalized (strip query/hash/hostname), hash -> `fingerprint`. Store on the event props and upsert an `error_groups` row (counts maintained atomically like other rollups in `02`).
- Groups table carries triage state; occurrences stay in `events` (partition lifecycle applies - group metadata outlives raw events, so first/last seen and totals live on the group row).
- Rate protection: per-site cap on error events/minute at ingest (an error loop on a popular page can flood ingestion - drop beyond cap, increment a `dropped` counter on the group, surface "rate-limited" badge).

## Frontend implementation

- `app/(app)/[site]/(dashboard)/errors/page.tsx` (+ `/errors/[groupId]`); `components/dashboard/errors/{group-row,stack-view,triage-menu,occurrences}.tsx`.
- Tracker: `packages/tracker/src/errors.ts` chunk (handlers, fingerprint-light dedupe, origin check), loaded when `errors_enabled`.

## Backend implementation

- Ingest: fingerprint + `error_groups` upsert inside `ingest_event` path (`02`); `lib/analytics/errors.ts`: `getErrorGroups(params)`, `getErrorGroup(id)`, `getOccurrences(id, cursor)`, triage mutations.

## Database changes

```sql
error_groups(id uuid pk, site_id uuid, fingerprint text, message text, type text,
             first_seen timestamptz, last_seen timestamptz, occurrences bigint, visitors_estimate bigint,
             status text default 'open' check (status in ('open','resolved','ignored')),
             resolved_at timestamptz, is_external bool, dropped bigint default 0,
             unique (site_id, fingerprint))
```

## API requirements

- `GET /api/sites/:id/errors?status=&f=&range=&cursor=`; `GET /api/sites/:id/errors/:groupId` (+ `/occurrences`); `PATCH /api/sites/:id/errors/:groupId` (status); `PATCH /api/sites/:id/settings` (errors_enabled).

## Dependencies

- None new. Requires `01` (chunk), `02` (ingest), `07` (session links).

## Edge cases

- Minified stacks (no sourcemap support in v1 - group by normalized frames anyway; note as future); "Script error." cross-origin messages (group as one external bucket, doc how to add `crossorigin` to get real messages); error storms (rate cap above); messages containing PII/user input (truncate + strip query strings from filenames/URLs in props); promise rejections with non-Error values (stringify safely); fingerprint drift after deploys renaming bundles (filename normalization strips content hashes like `app.abc123.js` -> `app.js`); status transitions racing with auto-reopen.

## Development milestones

1. Tracker chunk + ingest fingerprinting + `error_groups` upsert + rate cap.
2. Errors list screen with triage states.
3. Error detail (stack, timeseries, breakdowns, occurrences -> sessions).
4. Overview indicator + external-error handling + polish.

## Future improvements

- Sourcemap upload + symbolication (turns this into a Sentry-lite - big lift, separate plan); release/deploy tagging (`sdk` version field exists in payload) with "first seen in release" ; alerting (new group / regression -> email or webhook via `19`); breadcrumbs from the last N tracked events pre-error (data already exists in the session - render-only feature).
