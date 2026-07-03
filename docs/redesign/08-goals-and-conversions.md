# 08 - Goals & Conversions

> **Context**: WebSight has no goals today - only raw custom events in an `events` table with `event_name` + free-text `message`. After `02`/`14`, custom events carry JSON props and pageviews are queryable by path. Rybbit ships "customizable goals" in OSS; Plausible's goal UX (goals as filterable dimension, conversion-rate column) is the reference; Sleek has no documented goals (a gap we exceed it on).

## Overview

Goals turn raw traffic into success metrics: a named definition ("Signed up", "Reached checkout") matched against pageviews or custom events, reported as uniques, total conversions, and conversion rate, filterable and comparable like any other dimension. Goals are the prerequisite for funnels (`09`) and revenue attribution (`21`).

## Feature breakdown

- **Goal types**:
  - *Pageview goal*: path match - exact, contains, or wildcard (`/thanks/*`); optional hostname scope.
  - *Event goal*: event name match, optionally constrained by prop conditions (`plan is pro`) using the filter model from `05`.
- **Goals screen**: table of goals - name, type chip, uniques (converted visitors), total conversions, conversion rate (converted visitors / all visitors in range), delta vs comparison period, sparkline. Row click -> filters the whole dashboard by that goal (Plausible's verified click-to-filter applies to goals too).
- **Goal detail**: conversion timeseries, breakdowns (top sources/pages/countries/devices *for converters* - i.e. dashboard scoped by the goal filter), recent converting sessions (links into `07`).
- **CRUD**: create/edit dialog with live match preview ("this would have matched 214 events in the last 7 days" - the single best affordance for getting definitions right; none of the inspirations do it well); archive instead of delete (history preserved).
- **Overview integration**: Goals summary card on `04` (top 5 by conversions with rate).
- **Small details**: display currency-value per goal (static value field, e.g. signup = $5) for simple value reporting before `21` ships; a "test goal" button that listens for the next matching event live.

## UI/UX considerations

- Conversion rate must state its denominator on hover ("6.1% of 12,401 unique visitors in range") - ambiguity here erodes trust.
- Wildcard syntax gets inline examples and validation as-you-type.
- Empty state teaches both goal types with one-click templates ("Newsletter signup - event `newsletter_signup`", "Purchase - page `/thank-you`").
- Goals are org-visible objects; editing warns if used in funnels (`09`).

## Technical approach

- Goals are *definitions evaluated at query time*, not materialized flags (Plausible's model): `getGoalStats(goal, params)` compiles the definition to SQL over `events` (path pattern -> `LIKE`/regex, event name + prop conditions -> reuse `filtersToSql`). Keeps definitions editable retroactively - a goal created today reports historical data instantly (major UX win over tools that only count forward).
- Conversion uniqueness by `visitor_id` within range; "goal" as filter dimension = `EXISTS` subquery on matching events per session/visitor - add to the `05` dimension registry.
- Match preview = same compiler run over last-7-days with `COUNT(*)`.

## Frontend implementation

- `app/(app)/[site]/(dashboard)/goals/page.tsx` (+ `/goals/[id]`); `components/dashboard/goals/{goal-table,goal-dialog,match-preview,goal-summary-card}.tsx`. Dialog uses the `05` filter editor for prop conditions.

## Backend implementation

- Goals CRUD route handlers; goal compiler in `lib/analytics/goals.ts` (unit-test matrix: exact/contains/wildcard paths, event + props, unicode paths); `getGoalStats`, `getGoalTimeseries`, plus registry entry so `dim: 'goal'` works everywhere.

## Database changes

```sql
goals(id uuid pk, site_id uuid, name text, kind text check (kind in ('page','event')),
      path_pattern text, path_op text, event_name text, prop_filters jsonb,
      value_cents int, currency char(3), archived_at timestamptz, created_by uuid, created_at, updated_at)
```

## API requirements

- `GET/POST/PATCH/DELETE /api/sites/:id/goals` (delete = archive), `GET /api/sites/:id/goals/:goalId/stats`, `POST /api/sites/:id/goals/preview` (definition -> match count).

## Dependencies

- `02` (events), `05` (filter model/registry), `14` (props on events). No new packages.

## Edge cases

- Overlapping goals (same event matched by two goals - both count, document); path patterns matching query-stripped paths only; goals referencing renamed events (show "0 recent matches" warning badge); conversion rate when filters already scope to converters (rate = 100%, show absolute counts prominently instead); archived goals in historical funnel definitions (render with "archived" chip, still computable); per-visitor multiple conversions (uniques vs total distinction always visible).

## Development milestones

1. Schema + CRUD + compiler with tests.
2. Goals screen table + stats + sparkline.
3. Goal-as-filter dimension + Overview summary card + goal detail view.
4. Match preview + live "test goal" + templates in empty state.

## Future improvements

- Funnel auto-suggestion from goal pairs; goal-change annotations on charts; alerting ("conversion rate dropped >20% day-over-day"); dynamic goal values from event props (`props.value`) as the bridge to `21` revenue attribution.
