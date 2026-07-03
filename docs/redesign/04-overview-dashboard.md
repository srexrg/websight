# 04 - Overview Dashboard

> **Context**: Today's overview (`components/analytics/AnalyticsOverview.tsx`) shows 3 metric cards (Total Visits with a crude first-half-vs-second-half growth %, Page Views, Unique Visitors), a Recharts traffic area chart, device/OS lists, and a flat world map (`WorldMap.tsx`, react-simple-maps). Date ranges: today/yesterday/7/30/90 days via `?timeRange=`. No bounce rate, duration, comparisons, filters, or realtime. New data layer (`lib/analytics/queries.ts`) and shell primitives (MetricCard, BreakdownCard, TimeseriesChart) come from plans 02/03.

## Overview

Rebuild the Overview as the single information-dense screen users live in, modeled on Plausible's verified dashboard shape (switchable metric cards driving one main chart, click-to-filter breakdown cards, comparison mode) with Rybbit's richer metric set (bounce rate, session duration, sessions vs visitors distinction). This is the highest-traffic screen and the template for Pages/Sources/Audience screens.

## Feature breakdown

- **Six metric cards** (Plausible's verified six, adapted): Unique Visitors, Total Sessions, Pageviews, Views per Session, Bounce Rate, Avg Session Duration. Each card: mono value, delta vs comparison period with up/down arrow (green/red, inverted for bounce rate), and is **clickable to become the main chart's plotted metric**.
- **Main timeseries chart**: area chart of the selected metric; comparison period as dashed second series; granularity auto (hour for <=2 days, day for <=90, week/month beyond) with manual override; hover tooltip shows both periods and the % change.
- **Live pill**: "· 12 online" in the topbar, click navigates to Realtime (`06`).
- **Breakdown cards** (two-column grid below the chart, all rows click-to-filter per `05`):
  - Pages (tabs: Top Pages / Entry Pages / Exit Pages)
  - Sources (tabs: Channels / Referrers / UTM Campaign / UTM Source / UTM Medium)
  - Locations (tabs: Countries with flag emojis / Regions / Cities) + "Open Globe" link
  - Devices (tabs: Browser / OS / Screen size class)
  - Goals summary (top goals with conversion rate, links to `08`) - renders empty-teach state until goals exist
  - Custom events summary (links to Events screen)
- **Card details modal**: every breakdown card has a "Details" footer opening a full-height modal: search box, full sorted list, extra columns (visitors, pageviews, bounce, duration per row), CSV export of that dimension.
- **Date range picker**: presets (Today, Yesterday, Last 7/14/30/90 days, This/Last month, Year to date, All time, Custom) + **Compare** control with verified Plausible modes: previous period, year over year, custom period, and "match day of week vs exact date" alignment toggle; preference persisted per user.
- **Filter bar**: active filter pills row (owned by `05`) directly under the topbar.

## UI/UX considerations

- Metric cards must read as one system: 12px uppercase label, 30px JetBrains Mono value, 12px delta chip. Selected card gets an emerald underline; hover shows "Show on chart".
- Breakdown rows: label truncates middle (URLs), horizontal micro-bar behind the value scaled to the max row (Plausible pattern - reads faster than a separate bar chart; replaces today's duplicated chart+list layout in `PageAnalytics.tsx`).
- Deltas compare like-for-like: incomplete current periods compare against the same elapsed fraction, or label "period in progress" - do not repeat today's misleading half-vs-half growth number.
- Empty states per card ("No referrer data yet - traffic so far is direct") rather than blank tables; skeletons match final layout to avoid shift.
- The whole screen must be usable at 375px wide (single column stack, chart 200px tall).

## Technical approach

- One `GET`-shaped server fetcher per card, all going through `lib/analytics/queries.ts`: `getOverviewMetrics(params)` (one SQL over `sessions` + `events` rollups returning all six metrics + comparison), `getTimeseries(metric, params)`, `getBreakdown(dimension, tab, params, limit)`. TanStack Query caches per param-set; card queries fire in parallel and stream in independently (no all-or-nothing loading like today's `Promise.all` page).
- Bounce rate = bounced sessions / sessions; duration = avg `sessions.duration_s` (needs `02`'s server sessionization); views/session = pageviews / sessions.
- Comparison params computed client-side (pure function, unit-tested: previous period, YoY, custom, day-of-week alignment) and passed as a second range; queries return both series in one round trip.

## Frontend implementation

- `app/(app)/[site]/(dashboard)/overview/page.tsx` (server shell) + `components/dashboard/overview/{metrics-row,main-chart,breakdown-grid}.tsx` (client, TanStack Query).
- Reuse `MetricCard`, `BreakdownCard`, `TimeseriesChart` from `03`; add `ComparisonPicker` inside `DateRangePicker`.
- Delete `AnalyticsOverview.tsx`, `PageAnalytics.tsx` (Pages/Sources screens become filtered-preset routes reusing the same BreakdownCard grid), `AnalyticsClient.tsx` tab shell.

## Backend implementation

- Implement `getOverviewMetrics`, `getTimeseries`, `getBreakdown` in `lib/analytics/queries.ts` with SQL over `events`/`sessions`/rollups; each accepts the shared filter set from `05`. Entry/exit pages come straight off `sessions.entry_path`/`exit_path`. Channels come from `events.channel` (enriched in `02`).

## Database changes

- None beyond `02`. Possibly a `rollup_daily_pages(site_id, date, path, pageviews, visitors_hll)` if page breakdowns get slow; defer until measured.

## API requirements

- Internal fetchers (server actions or `/api/sites/:id/overview|timeseries|breakdown` route handlers - pick route handlers so `19`'s public API can reuse them with auth swapped).

## Dependencies

- Everything from `02`/`03`; `country-flag-icons` or emoji flags (zero-dep) for location rows.

## Edge cases

- Comparison against a period with zero traffic (show "new" instead of +inf%); metrics where lower is better (bounce) invert delta colors; sessions spanning the range boundary count where they started; "All time" disables comparison; sites with single-day data default to hourly granularity; filtered states where a card's dimension equals the active filter (show the filtered value highlighted, Plausible keeps the card visible).
- Timezone: "Today" means the site's timezone day, not UTC.

## Development milestones

1. Metrics row + main chart with metric switching (no comparison yet) on new data layer; parity check vs old numbers.
2. Breakdown grid with tabs + details modals; Pages/Sources routes as presets.
3. Date-range picker v2 + comparison modes + persisted preference.
4. Click-to-filter integration (with `05`), goals/events summary cards.
5. Polish: mobile, skeletons, empty states, keyboard shortcut for compare (`X`).

## Future improvements

- Sparkline-in-card (last 7 days) like the sites grid; annotations on the chart (deploy markers via API); scheduled snapshot email of this screen (pairs with `19`); anomaly badges ("Unusual spike from Reddit") feeding `20`'s AI insights.
