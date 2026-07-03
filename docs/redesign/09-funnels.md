# 09 - Funnels

> **Context**: No funnels exist in WebSight. Rybbit ships funnels in its OSS version - its creator explicitly called this out as the differentiator vs Plausible CE (verified), and Plausible gates funnels behind its Business plan. PostHog's funnel mechanics are the verified feature ceiling: step-ordering modes (sequential / strict order / any order), exclusion steps, three visualizations (conversion steps, time-to-convert, trends over time), and clickable steps revealing converted/dropped users. Prerequisites: `02` (events/sessions), `05` (filter model), `08` (goals as steps).

## Overview

Multi-step conversion funnels: define an ordered list of steps (pageviews, events, or existing goals), compute how many visitors progressed through each within a conversion window, and visualize where they drop off. Aim for PostHog's analytical core with Plausible's simplicity - a deliberate "6.5/10 richness" cut (Rybbit's stated philosophy): sequential ordering + drill-down + time-to-convert in v1; strict/any-order and exclusions later.

## Feature breakdown

- **Funnel definition**: name + 2-8 ordered steps; each step = pageview pattern, event (+ prop conditions), or a saved goal (`08`); per-funnel conversion window (30 min / 1 day / 7 days / 30 days); optional global filters baked into the definition (e.g. only `Channel is Organic`).
- **Funnel list screen**: saved funnels with overall conversion rate, entrants, completions, sparkline of completion rate over time.
- **Funnel detail** - primary visualization is the step bar chart (verified PostHog "conversion steps" view): per step - count, % of previous step, % of first step, drop-off count between steps rendered as the visual gap; hover reveals both percentage bases.
- **Step drill-down** (verified PostHog pattern): click a step -> panel with "converted" / "dropped off" visitor lists linking into sessions (`07`); dropped-off list is the actionable one.
- **Time-to-convert**: median + distribution of time from first to last step (verified PostHog second view) - a simple histogram, not the full UI.
- **Compare & filter**: date-range comparison shows previous-period conversion per step (Rybbit advertises period comparison); the global filter bar (`05`) applies live on top of the definition.
- **Breakdown (v1.5)**: segment the funnel by one dimension (channel/device/country) rendering grouped bars per step.
- **Ordering semantics v1**: *sequential* (steps in order, other events allowed between - PostHog's default). Strict-order, any-order, and exclusion steps are explicitly future scope.

## UI/UX considerations

- Drop-off is the story: render the between-step gap in red-tinted `--danger` with the absolute number lost ("-1,204 (38%)") - the number teams act on.
- Steps get editable labels defaulting to the match ("Visited /pricing"); definition editor is a vertical list with drag-reorder, using the `05` filter editor per step.
- Live definition preview: entrant count for step 1 over last 7 days while editing (same affordance as `08`'s match preview).
- Empty/insufficient states: <1 completion renders guidance, not an empty chart; funnels on stateless privacy mode are limited to the conversion window <= 1 day (visitor ids rotate daily) - surface this constraint in the editor, don't let users silently define a broken 7-day window.

## Technical approach

- Query-time computation, no materialization: window-function SQL over `events` - for each visitor, find earliest step-1 match in range, then earliest step-2 match after it within window, etc. Implement as a lateral-join chain compiled from the definition (steps reuse the goal/filter compilers). Per-step timestamps enable time-to-convert from the same pass.
- Cap analyzed range for heavy funnels via the monthly partitions; funnels over >90-day ranges compute per-month and merge.
- Unit = unique visitor (not session) with the privacy-mode caveat above; step matchers share `lib/analytics/goals.ts` compilation.

## Frontend implementation

- `app/(app)/[site]/(dashboard)/funnels/page.tsx` (+ `/funnels/[id]`, `/funnels/new`); `components/dashboard/funnels/{funnel-chart,step-editor,dropoff-panel,time-to-convert}.tsx`. Chart is custom (divs/SVG, not Recharts - funnel bars with gap annotations are simpler hand-rolled and match the design system exactly).

## Backend implementation

- `lib/analytics/funnels.ts`: definition schema (zod), SQL compiler, `computeFunnel(def, params)` returning per-step `{count, pctPrev, pctFirst, medianSecondsFromPrev}` + drill-down cursors; CRUD route handlers; drill-down endpoint returning visitor/session lists per step outcome.

## Database changes

```sql
funnels(id uuid pk, site_id uuid, name text, steps jsonb, window_minutes int,
        base_filters jsonb, created_by uuid, created_at, updated_at, archived_at)
```

## API requirements

- `GET/POST/PATCH/DELETE /api/sites/:id/funnels`; `GET /api/sites/:id/funnels/:id/results?range=&f=&compare=`; `GET .../steps/:n/visitors?outcome=converted|dropped&cursor=`.

## Dependencies

- `02`, `05`, `07` (drill-down target), `08` (goal steps). No new packages.

## Edge cases

- Repeated step matches (take earliest eligible); same event satisfying consecutive steps (require strictly later timestamp); visitors entering multiple times in range (count first entry per visitor; document); steps referencing archived goals (compute, badge as archived); window longer than range (allow completions after range end? v1: no - entrants in range, completions within window even past range end, clearly labeled); zero-entrant funnels; definition edits changing historical numbers (funnels are definitions, recompute - show "definition updated" timestamp).

## Development milestones

1. Definition schema + compiler + `computeFunnel` with SQL tests on seeded data.
2. Editor (steps, window, preview) + CRUD + list screen.
3. Funnel chart + drop-off panel + drill-down to sessions.
4. Comparison + global filter integration + time-to-convert histogram.
5. Privacy-mode window guard + polish.

## Future improvements

- Strict/any-order modes and exclusion steps (verified PostHog surface); one-dimension breakdowns; save drop-off group as segment/cohort; funnel trends view (completion rate over time as its own chart); correlation hints ("converters were 3x more likely from Organic" - PostHog gates this behind paid; shipping it free is a differentiator).
