# 11 - Retention Analysis

> **Context**: No retention exists in WebSight. Rybbit ships retention in OSS ("track returning visitors to measure loyalty"). PostHog's retention is the verified mechanical reference: cohort entry modes (first-time vs recurring), configurable intervals (hours/days/weeks/months), a triangle grid with period-0 = 100%, % relative to cohort size or previous period, drillable cells opening the retained-user list, and breakdowns. Hard constraint: cross-day retention requires stable visitor ids - i.e. persistent privacy mode or `identify()` (`01`/`02`); Rybbit's HN critics flagged exactly this tension.

## Overview

A cohort retention grid answering "do visitors come back": rows = cohorts of visitors who first appeared (or performed a start event) in a given week/month, columns = subsequent periods, cells = % who returned. Scoped honestly to persistent-mode sites; stateless sites get a teaching state instead of silently wrong numbers - an integrity improvement over inspirations that gloss over this.

## Feature breakdown

- **Retention grid**: triangle heatmap, rows newest-first, cohort size column, period-0 100%; emerald intensity scale; weighted average row on top.
- **Controls** (the useful PostHog subset):
  - Interval: day / week / month (weeks default; hours are noise for web analytics - deliberately dropped).
  - Cohort entry: *first ever seen* (default) or *performed event/goal* (e.g. "signed up" retention - reuses `08` matchers).
  - Return criterion: *any visit* (default) or *performed event/goal*.
  - Cell basis: % of cohort (default) or % of previous period (verified PostHog option, cheap to add).
- **Cell drill-down** (verified pattern): click a cell -> panel listing the visitors retained in that period, linking to profiles/sessions (`07`).
- **Cohort trend line**: click a row -> that cohort's decay curve as a line chart; select multiple rows to overlay (quick "are newer cohorts retaining better" answer - small but high-value beyond Rybbit).
- **Filter integration**: global filters (`05`) scope cohort membership (e.g. retention of `Channel is Organic` visitors).
- **Mode guard**: stateless-mode sites see the grid replaced with an explainer + one-click link to enable persistent mode (with the privacy trade-off spelled out) or `identify()` docs.

## UI/UX considerations

- Cells show % with visitor count on hover ("18% - 41 of 228"); cells under a minimum cohort size (n<10) render hatched with "low sample" tooltip - percentage noise on tiny cohorts misleads.
- Incomplete periods (current week) render with a dashed border and "in progress" tooltip, not as bad retention.
- The grid scrolls horizontally inside its card beyond ~12 periods; row labels stay sticky.
- Color scale is per-grid normalized (max non-period-0 cell = full intensity) so low-retention sites still show relative structure.

## Technical approach

- SQL: cohort assignment = min(`sessions.started_at`) per `visitor_id` (or first matching start event) bucketed by interval in site timezone; returns = `EXISTS` session/event in each subsequent bucket. One grouped query producing `(cohort_bucket, period_n, returned_count)` + cohort sizes; date-trunc buckets bounded by range (default: last 12 intervals).
- `user_id` supersedes `visitor_id` when present (identified users retain across devices).
- Cache results per `{site, params}` for 1h (TanStack Query + route-level `s-maxage`) - retention is expensive and slow-moving.

## Frontend implementation

- `app/(app)/[site]/(dashboard)/retention/page.tsx`; `components/dashboard/retention/{grid,cell-drilldown,cohort-trend,controls}.tsx`. Grid is a CSS-grid table (no chart lib); trend overlays reuse `TimeseriesChart`.

## Backend implementation

- `lib/analytics/retention.ts`: `computeRetention(params)` -> `{cohorts: [{bucket, size, cells: [{n, returned, pct}]}], weightedAvg[]}`; drill-down endpoint returning visitor list per `(cohort, period)`.

## Database changes

- None beyond `02`/`07` (needs `sessions(site_id, visitor_id, started_at)` index, already added in `07`).

## API requirements

- `GET /api/sites/:id/retention?interval=&entry=&return=&basis=&f=&range=`; `GET .../retention/visitors?cohort=&period=&cursor=`.

## Dependencies

- `02`, `05`, `07`, `08` (event-based entry/return). No new packages.

## Edge cases

- Privacy-mode switch mid-history (cohorts before the switch are unreliable - annotate the boundary); visitors first seen before the visible range (excluded from cohorts by definition - "first ever" needs all-time min, use `profiles.first_seen` from `07` to avoid full scans); timezone bucket boundaries; `identify()` happening on a visitor's 3rd visit (merge by user_id going forward; document non-retroactivity); deleted visitors (GDPR) shrinking historical cohorts (accepted).

## Development milestones

1. `computeRetention` (first-seen entry, any-visit return, weekly) + tests.
2. Grid UI + hover details + low-sample/incomplete-period treatments.
3. Entry/return event modes + basis toggle + filters.
4. Cell drill-down + cohort trend overlays + mode guard for stateless sites.

## Future improvements

- Breakdown by dimension (retention by channel/country - verified PostHog surface); save a cohort as a segment (`05`); retention as a metric on Overview ("returning visitor rate" card); scheduled cohort report email (`19`).
