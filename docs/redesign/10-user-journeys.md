# 10 - User Journeys (Paths)

> **Context**: No journey/path analysis exists in WebSight. Rybbit ships "user journeys" in OSS (verified in its README feature list). PostHog's paths tool is the richer reference. Prerequisites: `02` (ordered events with sessions), `05` (filters), `07` (session drill-down).

## Overview

A Sankey-style visualization of how visitors actually move through the site: from entry (or any chosen starting point) through successive pages/events, with edge thickness showing volume and explicit drop-off at every hop. Journeys answer "where do people go next / where did they come from" - the exploratory complement to funnels' hypothesis-testing.

## Feature breakdown

- **Journey view**: left-to-right Sankey with N columns (default 4 steps, max 6); nodes = pages (or events, toggleable), sized by visitor count; edges sized by transition volume; a per-column "drop-off" sink node showing sessions that ended there.
- **Anchoring modes**: *starts with* (default: session entry, or a user-chosen page/event - "what happens after landing on /pricing"), and *ends with* (reverse journey: "what paths lead to /signup") - both verified as the core PostHog path controls worth keeping; anything fancier is out.
- **Node interactions**: click a node -> context menu: "filter dashboard to sessions through this node", "set as start", "set as end", "view sessions" (drill-down to `07` list scoped to the transition - the aggregate-to-individual pattern from PostHog).
- **Grouping controls**: collapse dynamic path segments via wildcard rules (`/blog/*` groups all posts) - reuses goal path patterns (`08`); "top N per column" selector (default 8, rest as "Other").
- **Filter/date integration**: global filter bar and range apply; comparison mode is out of scope for the graph (meaningless visually) but the summary stats row (total journeys, most common full path, avg path length) does compare.
- **Small details**: hovering an edge shows count + % of source node; "Other" nodes expand on click; export the visible graph as PNG (marketing-friendly).

## UI/UX considerations

- Sankeys degrade fast: hard-cap visible nodes (~40) before rendering; prefer aggregation over scroll. The default view must be legible without configuration - entry pages -> 3 hops, top 8 per column.
- Emerald flow gradient on edges over `--surface`; drop-off sinks in muted `--danger` tint; node labels truncate middle with full path in tooltip.
- Loading state is a skeleton Sankey (gray blocks/ribbons) - this query is the slowest in the product; perceived performance matters.
- Mobile: Sankey is genuinely bad on small screens - render a ranked "top paths" list (sequence chips with counts) instead, same data.

## Technical approach

- Query: per session in range, take the ordered sequence of pageview paths (post-grouping), truncate to K steps from the anchor (or K steps *before* it in ends-with mode via reversed ordering), then `GROUP BY` step-tuples to get node/edge counts - one SQL pass with `array_agg(path ORDER BY created_at)` per session, sequence processing in Node (sessions are small; stream and aggregate in the route handler with a row cap + sampling beyond ~200k sessions, labeled "sampled").
- Grouping rules applied before aggregation (regex from wildcard patterns, memoized).
- Rendering: Recharts has a Sankey but it is limited; use `d3-sankey` (tiny, layout-only - d3 deps already exist via the map overrides) with custom SVG nodes/edges matching the design system.

## Frontend implementation

- `app/(app)/[site]/(dashboard)/journeys/page.tsx`; `components/dashboard/journeys/{sankey,node-menu,anchor-picker,grouping-dialog,top-paths-list}.tsx`. Anchor picker reuses the `05` value type-ahead (pages/events ranked by traffic).

## Backend implementation

- `lib/analytics/journeys.ts`: `computeJourneys({anchor, direction, steps, topN, grouping, filters, range})` -> `{nodes[], edges[], dropoffs[], sampled}`; sessions-through-node drill-down endpoint (filters sessions whose path sequence contains the node at the column position).

## Database changes

- None. Optional stored grouping rules: `sites.settings.path_groups jsonb` (site-wide, also useful for Pages breakdowns in `04`).

## API requirements

- `GET /api/sites/:id/journeys?anchor=&dir=&steps=&topN=&f=&range=`; `GET .../journeys/sessions?node=&col=&cursor=`.

## Dependencies

- `d3-sankey` (new, ~4KB). Everything else from `02`/`05`/`07`.

## Edge cases

- Single-page sessions dominate most sites (they are all drop-off at column 1 - show them, they are the bounce story); loops (A->B->A: allowed, nodes are per-column instances, not globally merged - key nodes as `col:path`); sessions longer than K steps (truncate with "continues" indicator); anchor page with zero traffic in range; grouping rules that merge the anchor itself; RTL/very long URLs; sampled results must be labeled with the sample rate (no silent truncation).

## Development milestones

1. `computeJourneys` starts-with mode + tests on seeded sequences.
2. Sankey rendering + hover/tooltips + top-N/Other.
3. Node menu (set start/end, filter, drill-down) + ends-with mode.
4. Grouping rules + mobile top-paths list + PNG export.

## Future improvements

- Event nodes interleaved with page nodes (toggle exists, ship pages-only first); journey diffs between segments ("Organic vs Paid paths"); auto-insight ("34% of /pricing visitors loop back to /features" feeding `20`); saved journey views.
