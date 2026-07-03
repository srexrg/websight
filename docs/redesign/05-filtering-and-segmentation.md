# 05 - Filtering & Segmentation

> **Context**: WebSight currently has zero filtering - the only control is a 5-preset date dropdown. The new data layer (`02`) stores every event/session with denormalized dimensions (path, channel, referrer_domain, utm_*, country/region/city, device/browser/OS, props). Rybbit advertises "advanced filtering across 15+ dimensions"; Plausible's filtering UX is the verified gold standard and is specified below.

## Overview

A global filter system shared by every dashboard screen: click any breakdown row to filter, stack filters across dimensions, edit them with operators, and save common combinations as segments. Filters live in the URL, apply to all cards/charts/screens simultaneously, and are the substrate for funnels/journeys/sessions filtering later.

## Feature breakdown

- **Click-to-filter** (verified Plausible pattern): every row in every BreakdownCard is clickable and adds `dimension = value` as a filter; clicking a country on the map or globe does the same.
- **Filter button + editor**: dropdown listing all dimensions - Page, Entry/Exit page, Channel, Referrer, UTM (source/medium/campaign/term/content), Country/Region/City, Device type, Browser, OS, Screen class, Goal, Event name, Event property (key+value), Hostname, Language, Visitor type (new/returning - persistent mode only). Each filter supports verified operators: **is / is not / contains / does not contain**, multi-select values within a dimension, type-ahead value search backed by a `getDimensionValues` query.
- **Filter pills**: active filters render as pills under the topbar (`Country is US ×`), individually removable, `Esc` clears all (verified detail), "Clear all" affordance.
- **Saved segments** (verified Plausible two-tier model): "Save as segment" in the filter menu -> name + visibility (Personal / Site - visible to all site members). Segments appear at the top of the filter dropdown and as a pill with an edit affordance. Editing a segment updates it for everyone with access.
- **Cross-screen persistence**: filters follow navigation between Overview/Pages/Sources/Realtime/Sessions etc. (URL param carried by the nav links), and compose with comparison mode.
- **Improvement beyond inspiration**: filter negation on props (`plan is not free`), and an inline "x% of total traffic" annotation on the metrics row whenever filters are active - tells users segment size at a glance, which none of the inspirations surface.

## UI/UX considerations

- Pills must show dimension + operator compactly (`Page contains /blog`), truncate long values, and stack/wrap on mobile into a "2 filters" summary chip opening a sheet.
- The filter editor is a popover with dimension list -> operator select -> value multi-combobox (shadcn `Command`); Enter applies; the whole flow must be keyboard-completable.
- Type-ahead values are ranked by traffic in the current range (most useful first) and show counts.
- When a filter makes a card redundant (filtering `Country is US` while viewing Countries tab), highlight the filtered row rather than hiding the card.
- Segments: personal vs site visibility must be explicit at save time; site segments show an org icon.

## Technical approach

- **Canonical filter model**: `type Filter = { dim: string; op: 'is'|'is_not'|'contains'|'not_contains'; values: string[] }`, serialized to URL as `f=country:is:US,DE;page:contains:/blog` via a `nuqs` custom parser (compact, shareable). One `filtersToSql(filters)` function in `lib/analytics/filters.ts` translates to parameterized WHERE clauses over `events`/`sessions` (dimension registry maps dim -> column/table/prop-path; contains -> `ILIKE %v%`; props -> `props->>key`).
- Every query in `lib/analytics/queries.ts` accepts `filters: Filter[]` and pipes through `filtersToSql` - single choke point, no per-screen filter logic.
- Session-level vs event-level dims: entry/exit/duration/bounce filter on `sessions`; page/event dims filter `events` then join to sessions when the metric is session-scoped (visitors, bounce). Define scoping per dimension in the registry once.
- `getDimensionValues(dim, query, range)` powers type-ahead (`SELECT dim, count(*) ... WHERE dim ILIKE ... GROUP BY 1 ORDER BY 2 DESC LIMIT 10`).

## Frontend implementation

- `components/dashboard/filters/{filter-bar,filter-pill,filter-editor,segment-menu,save-segment-dialog}.tsx`; `lib/analytics/filters.ts` (model, URL codec, registry) shared client/server.
- `BreakdownCard` rows call `addFilter(dim, value)` from a `useFilters()` hook (nuqs-backed); map/globe components receive the same hook.
- Keyboard: `Esc` handler at shell level; `f` opens the filter editor.

## Backend implementation

- `filtersToSql` with a unit-test matrix (every dim x every op); `getDimensionValues` endpoint; segments CRUD.

## Database changes

```sql
segments(id uuid pk, site_id uuid, owner_id uuid, name text, filters jsonb,
         visibility text check (visibility in ('personal','site')), created_at, updated_at)
```

## API requirements

- `GET /api/sites/:id/dimension-values?dim=&q=&range=`
- `GET/POST/PATCH/DELETE /api/sites/:id/segments` (owner or site-member rules per visibility).

## Dependencies

- `nuqs` (from `03`), shadcn `Command`/`Popover`. No new heavy deps.

## Edge cases

- URL length with many multi-select values (cap values per filter at 20; beyond that suggest a segment); special characters in values (URL codec must escape `:`, `;`, `,`); filtering a dimension that is null for most rows (offer "(none)" as a value); case sensitivity (paths case-sensitive, everything else case-insensitive); prop filters on high-cardinality JSON (LIMIT + index note: GIN on `props` from `02`); deleting a segment another member has bookmarked (URL falls back to inline filters snapshot - store resolved filters in URL when applying a segment, plus the segment id for the pill label).
- Filters + comparison: comparison period gets identical filters (never compare filtered vs unfiltered).

## Development milestones

1. Filter model + URL codec + `filtersToSql` + registry (path/country/device/channel first) wired into Overview queries.
2. Click-to-filter on all BreakdownCards + pills + Esc/clear.
3. Filter editor with operators + type-ahead values; full dimension registry incl. props.
4. Saved segments (CRUD, two visibility tiers, pill UX).
5. Segment-size annotation + mobile sheet + tests.

## Future improvements

- Boolean OR groups between filters (Plausible lacks this; PostHog has it - big power-user win); visitor-type cohort filters fed by `11`; segment usage analytics ("this segment is used in 3 funnels"); alerting on segments ("email me when signups from `Channel is Organic` drop 30%").
