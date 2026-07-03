# 03 - Dashboard Shell & Design System Migration

> **Context**: The landing page (branch `revamp/foundation-landing`) already ships the new emerald light design system: tokens in `app/globals.css` (`--brand: #0E9C6E`, bg `#F6F7F9`, surface `#FFFFFF`, fg `#1A1B25`), Hanken Grotesk + JetBrains Mono via `app/layout.tsx`, shadcn/ui primitives in `components/ui/`. But the authenticated app (`app/(root)/layout.tsx`, `dashboard`, `website/[domain]`, `settings`, `components/ui/header.tsx`) still uses the old dark/indigo theme (`bg-black`, `bg-zinc-900/40`, blue-600) with dead font classes (`font-oswald`, `font-jakarta`) and Lucide icons. The intended 8-screen dashboard design exists as a static mock in `design/WebSight.dc.html` + `design/design-system.md`, with a `.dark` token block in globals.css marked "not shipped yet".

## Overview

Build the application shell that all analytics screens (plans 04-21) plug into: a left sidebar layout per the design mock, the emerald token system extended into the authed app, working dark mode, a site switcher, global date-range/comparison controls, and shared primitives (metric card, breakdown card, chart theming, empty/loading/error states). This kills the two-design-systems problem in one move. Plausible's verified dashboard shape (one unified dashboard, no sub-menu maze) and Rybbit's screen split (Overview, Realtime, Globe, Pages, Sources, Audience, Events, Settings) are the references - WebSight's own mock already reflects them.

## Feature breakdown

- **Sidebar shell**: logo, site switcher (dropdown with favicon via Google s2, search when > 5 sites), nav sections - Analytics (Overview, Realtime, Globe, Pages, Sources, Audience, Events), Behavior (Sessions, Funnels, Goals, Journeys, Retention - appear as plans ship), Health (Web Vitals, Errors), bottom: Settings, Docs, user menu (avatar, org switcher later, theme toggle, sign out). Collapsible to icon rail; state persisted.
- **Top bar** (per-screen): screen title, live-visitor pill (click -> Realtime, the verified Plausible pattern), date-range picker + compare control + filter bar (owned by `05`), export/share actions slot.
- **Dark mode**: finish the `.dark` token block, `next-themes` class strategy, system default, toggle in user menu. Charts, globe, and map must all re-theme (CSS variables only - Recharts reads `var(--chart-*)` via the shadcn chart wrapper already in `components/ui/chart.tsx`).
- **Shared primitives** (new `components/dashboard/`):
  - `MetricCard`: label, JetBrains Mono value, delta chip (vs comparison), optional sparkline, clickable to switch the main chart metric (Plausible's six-metric switcher).
  - `BreakdownCard`: title, tab group (e.g. Pages/Entry/Exit), rows with label + bar + value + %, click-to-filter rows, "Details" expander opening a full modal with search + pagination.
  - `TimeseriesChart`: themed Recharts area/line with comparison series, granularity switch (hour/day/week/month), weekend shading, tooltip with both periods.
  - `EmptyState`, `ErrorState`, `Skeleton` variants for every card; `NumberFlow`-style animated numbers optional.
- **Routing**: `app/(root)/website/[domain]/...` becomes `app/(app)/[site]/(dashboard)/{overview|realtime|globe|pages|sources|audience|events|...}` using the site `public_id` (from `02`). `/dashboard` remains the sites list ("My Websites" grid with mini sparklines - a small Rybbit/Plausible detail worth copying).
- **Data fetching**: adopt TanStack Query for all dashboard reads (route handlers or server actions as fetchers), keyed by `{site, screen, range, filters}`; removes the `router.push`-to-refetch and `useEffect` loading hacks in `AnalyticsClient.tsx`. Filters/date live in the URL via `nuqs` so every view is shareable/bookmarkable.

## UI/UX considerations

- Light theme is the default brand experience; dark must be first-class (Rybbit users praise its dark UI; WebSight currently has none).
- Density: analytics UIs live or die on scannability - 13px labels, 28-32px mono numerals, 8px grid, hairline borders (`--border`), no card shadows heavier than the landing style.
- Keyboard shortcuts from day one (Plausible verified): `X` compare toggle, `Esc` clear filters, `/` search sites, `?` shortcut sheet, number keys for date presets.
- Empty states teach: each screen's empty state explains what the feature needs (e.g. "Goals require the tracker v2 - copy snippet") with a doc link - competitors' empty states are consistently their weakest surface; make this a signature.
- Mobile: sidebar becomes bottom-sheet nav; cards stack single-column; charts stay readable (no horizontal page scroll).

## Technical approach

- One layout: `app/(app)/layout.tsx` (server) reads session + sites, renders `Sidebar` (client) + content. Delete the `bg-black`/Geist overrides in `app/(root)/layout.tsx`; keep marketing pages on the root layout.
- Theme: `next-themes` `ThemeProvider` at root with `attribute="class"`, complete `.dark` block in `globals.css` (surfaces `#0E1310`-family per the landing StatsBand, emerald stays `#0E9C6E`, borders alpha-white).
- URL state: `nuqs` parsers for `range`, `from`, `to`, `compare`, `filters` (encoded per `05`), `granularity` shared by all screens.
- Migration order: shell first with the existing three tabs' content ported into Overview/Pages/Events routes, then screens are replaced by plans 04+ one at a time - never two shells alive at once.

## Frontend implementation

- New: `components/dashboard/{sidebar,site-switcher,topbar,metric-card,breakdown-card,timeseries-chart,empty-state,date-range-picker}.tsx`; `lib/dashboard/nav.ts` (typed nav registry with feature flags so unbuilt screens hide); `app/(app)/[site]/(dashboard)/*/page.tsx` routes.
- Port `DomainManager.tsx` into the new sites grid; restyle `settings` and `dashboard` pages to tokens; delete `components/ui/header.tsx` old-theme usages; replace remaining Lucide icons with Phosphor for consistency (`components.json` already says phosphor).
- Providers: `QueryClientProvider` + `NuqsAdapter` + `ThemeProvider` in `app/(app)/layout.tsx`.

## Backend implementation

- Route-level auth guard (middleware matcher extended to `/[site]` paths); a `getSiteForUser(publicId)` helper enforcing ownership/org membership; per-screen fetchers in `lib/analytics/queries.ts` (from `02`).

## Database changes

- None beyond `02` (`sites.public_id` powers routing). Add `user_prefs jsonb` on `users` for persisted UI prefs (sidebar collapsed, theme, comparison mode - Plausible persists comparison preference; match that).

## API requirements

- Internal fetchers only. Optional `GET /api/sites/:id/live-count` for the topbar pill (or reuse realtime endpoint from `06`).

## Dependencies

- `@tanstack/react-query`, `nuqs`, `next-themes`. Already present: shadcn/ui, Recharts, Phosphor, framer-motion, `date-fns`.

## Edge cases

- Site with zero data (fresh install) -> every screen renders its teaching empty state, not zeros.
- Deep link to a screen for a site the user lost access to -> 404, not error boundary.
- Date ranges crossing DST/timezones: all bucketing in the site's configured timezone (`sites.timezone`), label accordingly.
- Theme flash on load (inline script from `next-themes`), globe/map WebGL contexts on theme switch (re-init material colors, don't remount).
- Legacy URLs `/website/[domain]?timeRange=` -> permanent redirects to new routes.

## Development milestones

1. Tokens finished (dark block), `next-themes`, authed-app restyle of existing pages (visual parity, no new features).
2. Shell: sidebar + topbar + routing + site switcher + sites grid; port existing 3 tabs into routes.
3. Shared primitives (MetricCard, BreakdownCard, TimeseriesChart, states) with Storybook-style demo route (`/design` behind flag).
4. TanStack Query + nuqs wiring; delete `AnalyticsClient` refetch hacks; keyboard shortcuts.
5. Mobile pass + prefs persistence.

## Future improvements

- Command palette (`cmd+k`: switch site, jump screen, apply filter); customizable Overview layout (drag cards); density toggle; white-label theming for agencies (pairs with `15`/`16`).
