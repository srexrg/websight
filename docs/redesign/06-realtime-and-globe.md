# 06 - Realtime View & 3D Globe

> **Context**: WebSight has no realtime today, but the pieces exist: a real three-globe/react-three-fiber globe already renders on the landing page (`components/ui/globe.tsx` + `components/landing/InteractiveGlobe.tsx`, emerald-themed, arcs, auto-rotate, `ssr:false`), and the design mock (`design/WebSight.dc.html`) has both a Realtime screen and a dedicated Globe screen. Rybbit's globe is its signature marketing feature (verified: "3D globe views", built with globe.gl/three.js); Plausible's verified realtime pattern: click the live-visitor count to enter, "last 5 minutes" definition (Sleek uses the same 5-min definition), 30s chart refresh.

## Overview

Two connected screens: **Realtime** (operational: who is on the site right now, what pages, where from) and **Globe** (the wow view: live traffic rendered on the 3D globe, doubling as geographic drill-down). The live-visitor pill in the topbar (from `03`) is the entry point everywhere. This is the feature with the highest demo/marketing value per engineering hour - the landing page already promises it ("LIVE · 327" mock).

## Feature breakdown

- **Live visitor count**: visitors with an event in the last 5 minutes (industry-consistent definition). Shown in topbar pill on every screen with a pulsing dot (`wsPulse` keyframe already exists in globals.css).
- **Realtime screen**:
  - Big mono live count + per-minute pageviews bar chart for the last 30 minutes (auto-refresh).
  - Active pages list (path + current visitor count), live top referrers, live countries, live device split - all click-to-filter into the normal dashboard.
  - **Event ticker**: reverse-chronological feed of the last ~50 events (pageview/custom/goal) with relative time, page, country flag, device icon - the landing page's `RealtimeHighlight` mock made real, same visual language.
- **Globe screen**:
  - The existing `components/ui/globe.tsx` fed with real data: pulsing points sized by active visitors per city/region, arcs animating from visitor location on new events (throttled), emerald-on-dark aesthetic in both themes (globe stays dark; it is the one intentionally dark surface in light mode, matching the landing StatsBand).
  - Side panel: Countries / Regions / Cities tabs (Rybbit's verified 3-level drill-down) with live counts; clicking a row focuses/rotates the globe and applies a location filter; clicking a globe point opens the same.
  - Range toggle: Live (5 min) / Today / selected range - the globe is also the geographic report, replacing the flat `WorldMap.tsx` as the primary geo view (keep a 2D map fallback for low-power devices/reduced-motion).
- **Small details worth copying**: last-24h mini sparkline above the ticker; "No one online" empty state with the site's peak-today count so the screen never feels broken.

## UI/UX considerations

- Refresh cadence: count + lists every 10s, ticker every 5s, chart every 30s (verified Plausible cadence for charts). Pause auto-refresh when tab hidden; show "paused" chip.
- Motion restraint: arcs capped (~10 concurrent), respect `prefers-reduced-motion` (static points, no auto-rotate), 30fps cap on the globe to save battery.
- The ticker must not jump under the cursor: new items pause while hovered (standard live-feed pattern).
- Realtime lists show absolute counts, not percentages (small numbers read honestly).

## Technical approach

- **Polling, not websockets, for v1**: Supabase + Vercel functions make polling far simpler and 10s freshness is competitive (Plausible polls). Endpoints return in <100ms off indexed queries on `events`/`sessions` (`last_event_at > now() - interval '5 min'`). Revisit SSE if/when a dedicated server exists.
- Live queries: `getLiveCount`, `getLiveBreakdown(dim)`, `getLiveTicker(sinceId)` (cursor by `events.id` so the client only fetches new rows), `getLiveMinuteSeries` - all in `lib/analytics/queries.ts`, all respecting active filters.
- Globe data: aggregate live sessions by city lat/lng (add a vendored city -> lat/lng lookup keyed by geo enrichment output from `02`; country centroid fallback). Reuse `three-globe` config from `components/ui/globe.tsx`, extract shared config so landing and app stay visually in sync.
- Historical mode reuses `getBreakdown('city', range)` from `04`.

## Frontend implementation

- `app/(app)/[site]/(dashboard)/realtime/page.tsx`, `.../globe/page.tsx`; `components/dashboard/realtime/{live-count,minute-chart,active-list,event-ticker}.tsx`; `components/dashboard/globe/{live-globe,geo-panel}.tsx` (dynamic import, `ssr:false`, reusing `components/ui/globe.tsx`).
- TanStack Query with `refetchInterval` per cadence above; ticker uses cursor param and prepends.
- Topbar pill (from `03`) consumes `getLiveCount` with 15s interval, links to `/realtime`.

## Backend implementation

- Route handlers `GET /api/sites/:id/live/{count,breakdown,ticker,series}`; index `events(site_id, created_at DESC)` already covers them (`02`). Ticker excludes bot-filtered rows and respects privacy mode (no visitor ids exposed - only session-scoped display).

## Database changes

- None beyond `02`. Optional partial index: `sessions(site_id, last_event_at) WHERE last_event_at > now() - interval '1 hour'` is not possible (non-immutable predicate) - use a plain btree on `(site_id, last_event_at)`.
- Vendored `data/city-coords.json` (city geo lookup) or store lat/lng at enrichment time as `events.lat/lng` rounded to 1 decimal (~11km, privacy-safe). **Recommended: store rounded lat/lng at ingest** - avoids lookup drift.

## API requirements

- The four live endpoints above, authed as site member; they will be reused by public dashboards (`15`) with share-token auth.

## Dependencies

- Already present: `three`, `three-globe`, `@react-three/fiber`, `@react-three/drei`. New: none (city coords vendored or computed at ingest).

## Edge cases

- High-traffic ticker (>50 events/5s): sample and label "showing sample"; zero-traffic globe (idle rotation + empty-state copy); multiple tabs polling (TanStack Query dedupes per tab only - acceptable); serverless cold starts inflating first paint (skeleton for 1 poll cycle); WebGL unavailable (fall back to 2D `WorldMap.tsx` automatically); privacy: city display requires city-level geo which some CDN headers omit -> degrade to country gracefully.
- Clock display: relative times ("12s ago") tick client-side between polls.

## Development milestones

1. Live endpoints + topbar pill.
2. Realtime screen (count, minute chart, active pages/referrers/countries).
3. Event ticker with cursor pagination.
4. Globe screen live mode (points + arcs + side panel drill-down + click-to-filter).
5. Globe historical mode replacing `WorldMap` as primary geo view; reduced-motion/2D fallbacks.

## Future improvements

- SSE/websocket push when off serverless; "watch a session live" jump into `07`'s session detail; globe as embeddable public widget (marketing pairing with `15`); per-goal live conversion ticker; office-TV mode (fullscreen globe + big numbers - teams genuinely use this).
