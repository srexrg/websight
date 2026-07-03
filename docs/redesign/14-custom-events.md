# 14 - Custom Events v2

> **Context**: Today custom events are a bare `events` table (`event_name`, free-text `message`) fed by `POST /api/events` with a per-user Bearer key, rendered as a flat list (`CustomEventsAnalytics.tsx`). No properties, no aggregation, no client API. Rybbit's verified model: "custom events with JSON properties"; Sleek exposes `window.analytics.track(name, props)` and a "Custom Events" card on Overview. Plans `01` (tracker `websight.track`, `data-ws-event` attributes) and `02` (unified `events.props jsonb`) provide the pipes.

## Overview

Make custom events a first-class analytical dimension: named events with typed-ish JSON properties, sent from the browser SDK or server-side API, aggregated on their own screen, filterable everywhere, and usable as goal/funnel/retention building blocks. This is the layer that converts WebSight from traffic analytics to product-ish analytics without PostHog's complexity.

## Feature breakdown

- **Sending paths**:
  1. Browser: `websight.track('signup', {plan: 'pro'})` (from `01`).
  2. No-code: `data-ws-event="cta_click"` + `data-ws-prop-*` attributes on any element.
  3. Server: `POST /api/events` v2 with site-scoped API keys (moving off the per-*user* key - see `19`'s key management), accepting `{name, props, user_id?, visitor_id?, ts?}` - closes Rybbit's launch gap (no server-side API).
- **Events screen**:
  - Event names table: name, count, unique visitors, trend sparkline, last seen; click -> event detail.
  - Event detail: timeseries, **property explorer** - list of prop keys seen for this event, click a key -> value breakdown (top values with counts/%) - the feature that makes JSON props useful; neither inspiration surfaces prop exploration this directly.
  - Recent occurrences list with expandable props, linking to sessions (`07`).
- **Everywhere integration**: `Event name` and `Event property` are filter dimensions (`05`); event+prop conditions define goals (`08`), funnel steps (`09`), retention entry/return (`11`); Overview gets the events summary card (`04`).
- **Governance**: per-site event dictionary - auto-populated names with optional description + "expected props" annotations; unexpected-prop badge as a soft data-quality nudge (lightweight, not blocking); rename-safe (dictionary maps display name; raw name is truth).
- **Migration**: legacy `message` strings become `props: {message}`; old rows backfilled in the `02` migration; legacy endpoint keeps accepting the old shape indefinitely (cheap, avoids breaking existing users).

## UI/UX considerations

- The events table must aggregate (names, not a raw feed) - today's flat list is the anti-pattern; the raw feed lives inside detail/occurrences.
- Prop value breakdowns are BreakdownCards (click-to-filter applies).
- Empty state: interactive - a "send a test event" snippet with the site's key prefilled and a live listener showing the event arrive (mirrors onboarding's wait-for-data pattern from `17`).
- Docs pages (`app/(root)/docs/custom-events`) rewritten with browser/no-code/server tabs and a prop-design guide (flat, low-cardinality values).

## Technical approach

- All reads over `events WHERE name NOT IN (reserved)` (reserved = pageview/session/system names) using `02` indexes; prop key listing via `jsonb_object_keys` sampled over recent partitions (cap scan: last 100k rows per event) cached 10 min - full-history key scans are unnecessary.
- Value breakdown: `props->>key` group-by with GIN index support; high-cardinality guard (if distinct values > 500 in sample, show top 50 + "high cardinality" note instead of pretending completeness).
- Server API auth: `site_api_keys` (from `19`) checked + rate-limited per key; server events skip UA/geo enrichment unless headers provided (accept optional `ip`/`ua` fields for proxied sends, documented).

## Frontend implementation

- `app/(app)/[site]/(dashboard)/events/page.tsx` (+ `/events/[name]`); `components/dashboard/events/{names-table,prop-explorer,occurrences,test-event-panel}.tsx`. Delete `CustomEventsAnalytics.tsx`.

## Backend implementation

- `/api/events` v2 route (site key auth, zod validation, batch support, writes through `ingest_event`); `lib/analytics/events.ts`: `getEventNames`, `getEventDetail`, `getPropKeys`, `getPropValues`, `getOccurrences`; dictionary CRUD.

## Database changes

```sql
event_dictionary(site_id uuid, name text, description text, expected_props jsonb,
                 first_seen timestamptz, last_seen timestamptz, pk (site_id, name))
```
(auto-upserted at ingest; `site_api_keys` defined in `19`.)

## API requirements

- `POST /api/events` (v2 shape + legacy compat), `GET /api/sites/:id/events/{names,detail,props,values,occurrences}`, `GET/PATCH /api/sites/:id/event-dictionary`.

## Dependencies

- `01`, `02`, `05`; `zod` for payload validation (add if not present).

## Edge cases

- Prop payload caps (8KB, 30 keys, values stringified at 500 chars - reject/trim with response hint in dev, silent trim in beacon); nested objects (flatten one level `a.b`, drop deeper); numeric props (store as JSON numbers; value breakdowns bucket numerics into ranges); event name hygiene (trim, cap 120 chars, reject reserved names); PII in props (docs warning + per-site blocklist keys like `email` optionally hashed at ingest); clock-skewed server `ts` (clamp to ±48h); dictionary rows for events that stop arriving (show "stale" after 30 days).

## Development milestones

1. Ingest path unification (browser + legacy endpoint -> `events.props`) + backfill.
2. Events screen (names table, detail, occurrences).
3. Prop explorer + filter-dimension integration.
4. Server API v2 with site keys + docs rewrite + test-event panel.
5. Dictionary + governance nudges.

## Future improvements

- Typed prop schemas with validation reports; event-based computed metrics ("sum of props.value" as chartable metric - bridges to `21` revenue); autocapture heuristics (rage clicks, text of clicked buttons) as an opt-in chunk; event alerting ("notify when `purchase` drops 50% dod").
