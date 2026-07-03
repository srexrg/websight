# 12 - Web Vitals / Performance Monitoring

> **Context**: Nothing performance-related exists in WebSight. Rybbit monitors Core Web Vitals - verified metric set LCP, CLS, INP, FCP; Sleek claims LCP/CLS/FCP/TTFB auto-tracking. The tracker plan (`01`) reserves a lazy-loaded extension chunk (`t-x.js` vitals module wrapping the ~1.5KB `web-vitals` library) and the data model (`02`) accepts `web_vital` events with props. This plan covers capture-to-dashboard.

## Overview

Real-user Core Web Vitals monitoring: capture LCP, CLS, INP, FCP, TTFB from actual visitors, rate them against Google's thresholds, and show which pages, devices, and countries are slow. This closes a gap Plausible/Fathom-class tools leave open and matches Rybbit's health surface, with a page-first presentation (users think "which pages are slow", not "what is my global INP").

## Feature breakdown

- **Capture**: the vitals chunk reports each metric once per page load with attribution data (`web-vitals/attribution` build: LCP element selector, CLS worst-shift target, INP interaction target) as `web_vital` events - attribution is the improvement over both inspirations, which show scores without the *why*.
- **Vitals screen**:
  - Header cards: p75 per metric (Google's standard percentile) with Good / Needs improvement / Poor rating color and threshold annotations; distribution mini-bar (good/ni/poor %) per card - the CrUX presentation pattern.
  - Timeseries of the selected metric's p75 (comparison mode supported).
  - **Pages table**: per-path p75 for all five metrics as rating dots + sample count; sortable; click -> page detail with per-metric distributions and top attributed elements ("LCP element: `img.hero-shot` on 82% of slow loads").
  - Breakdowns: device type, browser, country (p75 per group) - reusing BreakdownCard.
- **Filter/date integration**: global filters apply (vitals by channel answers "are ad landing pages slow").
- **Rating system**: Google thresholds hardcoded with docs links (LCP 2.5s/4s, CLS 0.1/0.25, INP 200ms/500ms, FCP 1.8s/3s, TTFB 800ms/1800ms).
- **Small details**: sample-size honesty everywhere (p75 hidden under n<30 with "collecting data" state); soft navigations in SPAs noted as excluded (web-vitals library scopes to hard loads).

## UI/UX considerations

- Ratings use semantic colors distinct from the emerald brand ramp: `--success`/amber/`--danger` dots, not filled backgrounds, to keep the screen calm.
- Metric cards explain in one tooltip sentence what each vital means in user terms ("INP: delay after a click/tap").
- Empty state: vitals disabled -> explainer + "Enable" toggle (writes `sites.settings.vitals_enabled`, the tracker picks it up per `01`); enabled but no data -> "waiting for first samples".
- Mobile-vs-desktop is the first split users need - a persistent device-type segmented control on this screen (defaulting to All) in addition to global filters.

## Technical approach

- Events arrive as `{name: 'web_vital', props: {metric: 'LCP', value: 2140, rating: 'good', path, element?, loadState?}}` - one event per metric per load (batched by the tracker's queue; final values flush on `visibilitychange` per web-vitals guidance).
- Percentiles: `percentile_cont(0.75)` over `events` filtered to `name='web_vital'` grouped by metric/path/etc. Store `value` as numeric in a dedicated column? No - keep in `props` but add a generated column `vital_value numeric generated always as ((props->>'value')::numeric) stored` on the events partition set, plus partial index `WHERE name='web_vital'` for cheap percentile scans.
- Volume control: sample vitals client-side per site setting (default 100%; large sites can set 10%) - sampled rate stored so counts can be extrapolated and labeled.

## Frontend implementation

- `app/(app)/[site]/(dashboard)/vitals/page.tsx` (+ `/vitals/[metric]` or query-param detail); `components/dashboard/vitals/{metric-cards,dist-bar,pages-table,attribution-panel}.tsx`.
- Tracker side (in `packages/tracker`): `src/vitals.ts` chunk using `web-vitals/attribution`, loaded only when enabled.

## Backend implementation

- `lib/analytics/vitals.ts`: `getVitalsSummary`, `getVitalsTimeseries`, `getVitalsByDimension`, `getVitalsPages`, `getAttribution(path, metric)`; settings toggle endpoint.

## Database changes

- Generated column + partial index on `events` as above (migration touches partitioned table - apply on parent, cascades to partitions).

## API requirements

- `GET /api/sites/:id/vitals/{summary,timeseries,pages,breakdown,attribution}`; `PATCH /api/sites/:id/settings` (vitals_enabled, vitals_sample_rate).

## Dependencies

- `web-vitals` (tracker chunk only). Dashboard: nothing new.

## Edge cases

- CLS/INP report late (on pagehide) - tracker must flush via `sendBeacon` on `visibilitychange:hidden`; duplicate reports on bfcache restores (web-vitals handles, but dedupe by session+path+metric at ingest as belt-and-braces); extreme outliers (cap stored value at metric-specific p999-sane bounds); Safari lacks INP/LCP support (show per-metric browser coverage note instead of misleading blanks); iframe/embedded pages skewing CLS (respect `data-exclude` paths); rating disagreement when thresholds change upstream (thresholds versioned in code, historical ratings computed at query time from raw values - never store the rating as truth, store the value).

## Development milestones

1. Tracker vitals chunk + ingestion acceptance + settings toggle.
2. Generated column/index + summary cards + timeseries.
3. Pages table + device/browser/country breakdowns + filters.
4. Attribution panel + sampling + coverage notes.

## Future improvements

- Alerting on p75 regressions; per-deploy annotations correlating regressions to releases; Lighthouse-style recommendations ("largest LCP element is an unoptimized image") derived from attribution data; uptime/synthetic checks as a sibling Health feature (Rybbit markets "uptime monitoring" adjacent to vitals).
