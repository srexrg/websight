# 07 - Sessions & User Profiles

> **Context**: WebSight stores `session_id` from the client today but has no sessions UI. After `02`, sessions are first-class server-side rows (`sessions` table: entry/exit, counts, duration, geo/device/channel, `visitor_id`, optional `user_id` from `identify()`). Rybbit's verified feature set includes "user profiles with complete histories including all sessions, events, interactions"; Sleek claims "visitor profiles with session-level journeys". PostHog's verified UX detail: aggregate views (funnels/retention) drill down to concrete user lists - sessions are that drill-down target.

## Overview

Two screens: **Sessions** (a filterable, chronological list of visits, each expandable into an event-by-event timeline) and **Profiles** (per-visitor aggregate: all sessions, first/last seen, totals - only in persistent privacy mode or for `identify()`-ed users). Sessions make every aggregate number in the product explorable down to "what did this person actually do", which is the single biggest trust-builder in analytics UX.

## Feature breakdown

- **Sessions list**: one row per session - time started, visitor chip (anonymized id or identified user), country flag + city, device/browser/OS icons, channel/referrer, entry -> exit path, pageview count, duration, bounce badge, goal-completed badges. Sorted newest first, infinite scroll, respects the global filter bar and date range (`05`).
- **Session detail** (drawer, not page - keeps list context): vertical timeline of every event in order with timestamps and gaps ("2m idle"), pageviews with titles, custom events with expandable JSON props, goals highlighted emerald, web vitals/errors inline if captured (`12`/`13`). Header: session metadata grid + "view profile" link.
- **Profiles list** (persistent mode / identified only): visitor id or user id + traits, first seen, last seen, session count, total pageviews, total goal conversions, top country/device. Search by user id.
- **Profile detail**: identity card (traits from `identify()`), lifetime metric cards, sessions list scoped to the visitor, event-name frequency table.
- **Privacy-aware degradation**: in stateless mode, Sessions works fully (sessions exist within a day) but Profiles is replaced by an explainer state: "Profiles require persistent mode or identify() - here's the trade-off" with a settings link. This mode-clarity is an improvement over both inspirations, which bury the caveat.
- **Small details**: hovering a session row previews the page path sequence as breadcrumbs; each session links to "view all sessions from this visitor"; export current session list as CSV.

## UI/UX considerations

- Rows are dense (48px) with iconography doing the heavy lifting; the timeline drawer uses the ticker visual language from `06`.
- Anonymized visitors get deterministic generated handles + identicon colors ("Visitor `a3f9`", consistent hue from hash) so humans can track them across the UI without exposing anything.
- Timeline must communicate duration honestly: idle gaps compressed with a visible "gap" marker, not hidden.
- Empty states: filtered-to-zero shows "no sessions match these filters" with one-click clear.

## Technical approach

- `getSessions(params, cursor)` paginates `sessions` by `(started_at, id)` cursor; `getSessionEvents(sessionId)` pulls ordered `events`. Both flow through `filtersToSql` (`05`) - session-scoped dims filter directly, event-scoped dims via `EXISTS` subquery.
- Profiles: `getProfiles` aggregates `sessions` grouped by `visitor_id` (or `user_id` when set) - needs an index `sessions(site_id, visitor_id, started_at)`. Traits from `identify()` stored on a `profiles` row upserted at ingest.
- Session detail drawer streams: metadata renders from the list row instantly; events fetch on open.

## Frontend implementation

- `app/(app)/[site]/(dashboard)/sessions/page.tsx`, `.../profiles/page.tsx` (+ `/profiles/[visitorId]`); `components/dashboard/sessions/{session-row,session-drawer,event-timeline}.tsx`, `components/dashboard/profiles/{profile-row,profile-header}.tsx`.
- Infinite scroll via TanStack Query `useInfiniteQuery`; drawer is shadcn `Sheet`; JSON props render with a compact key-value grid, expandable raw view.

## Backend implementation

- Queries above in `lib/analytics/queries.ts`; `profiles` upsert added to `ingest_event` RPC when `uid`/traits present (`02`).
- GDPR: `DELETE /api/sites/:id/visitors/:visitorId` erases profile + sessions + events for that visitor (admin-only; required once persistent mode exists).

## Database changes

```sql
profiles(site_id uuid, visitor_id text, user_id text, traits jsonb,
         first_seen timestamptz, last_seen timestamptz, sessions int, pageviews int,
         pk (site_id, visitor_id))
create index on sessions(site_id, visitor_id, started_at desc);
```

## API requirements

- `GET /api/sites/:id/sessions?cursor=&f=&range=`, `GET /api/sites/:id/sessions/:sessionId/events`, `GET /api/sites/:id/profiles`, `GET /api/sites/:id/profiles/:visitorId`, GDPR delete endpoint.

## Dependencies

- Nothing new beyond `02`/`03`/`05`.

## Edge cases

- Sessions still open (no exit yet): show "active now" badge, live-update if drawer open; very long sessions (>500 events): paginate the timeline; visitor id collisions across privacy-mode switches (mode change starts fresh ids - document, don't merge); identified user across multiple visitor ids (merge display by `user_id` at query time, keep raw rows); bots that slipped through (a "mark as bot" admin action that hides the visitor and feeds the filter list); stateless-mode profile links must never 404 confusingly - route guards to the explainer.

## Development milestones

1. Sessions list + filters + cursor pagination.
2. Session drawer with full event timeline.
3. Profiles list/detail for persistent mode + `identify()` traits.
4. Privacy-mode degradation states + GDPR delete.
5. CSV export + polish (identicons, hover previews).

## Future improvements

- Session replay (rrweb capture -> blob storage -> player; PostHog's verified architecture: full+incremental DOM snapshots, S3 blobs keyed by session, metadata in DB, TTL retention - big lift, own plan when prioritized); "sessions like this" similarity search; cohort-save from any filtered session list (PostHog pattern, feeds `11`).
