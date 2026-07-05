# 00 - Research Summary & Product Strategy

This folder contains the implementation-ready redesign plan for WebSight, an open-source privacy-first web analytics product. Each numbered file is a self-contained plan for one feature or system and can be handed to a developer or AI agent without extra context.

## Codebase context (shared by all plans)

- **Stack**: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4 (token-driven, `app/globals.css`), shadcn/ui (new-york, Phosphor icons), Recharts, framer-motion, Supabase (Postgres + Auth, Google OAuth only).
- **Ingestion today**: `public/tracker.js` (localStorage visitor id, sessionStorage session id) -> `POST /api/track` (`app/api/track/route.ts`) writing to `visits`, `page_views`, and a non-atomic `daily_stats` rollup. Custom events: `POST /api/events` with a per-user Bearer API key -> `events` table.
- **Dashboard today**: `app/(root)/website/[domain]/page.tsx` -> `components/analytics/AnalyticsClient.tsx`, 3 tabs (Overview, Pages & Sources, Events). Queries in `lib/actions/analytics.ts` (server action, 7 parallel queries + 3 Postgres RPCs). No realtime, sessions, funnels, bounce rate, filters, or dark mode.
- **Design target**: the emerald light design system already shipped on the landing page (`lib/landing/content.ts`, `components/landing/*`) and documented in `design/design-system.md` + `design/WebSight.dc.html` (8-screen dashboard mock: Overview, Realtime, Globe, Pages, Sources, Audience, Events, Settings). Brand emerald `#0E9C6E`, Hanken Grotesk UI font, JetBrains Mono for numbers.
- **Tenancy today**: flat `users -> domains`; every analytics row keyed by domain string. No orgs, teams, or billing.

## What the research found

### Rybbit (rybbit.com / rybbit.io) - primary inspiration

Open source (AGPL-3.0, ~12k GitHub stars), built by a solo developer (Bill Yang), self-host or cloud. Stack: Next.js frontend, Node/Fastify API, **ClickHouse for analytics events, Postgres for app data**, Caddy proxy. Explicit design philosophy from the creator: sit between Plausible's simplicity and PostHog's complexity - "~6.5/10 feature richness with an intuitive UI". That is exactly the slot WebSight should aim for.

Verified feature surface: all core web metrics (sessions, uniques, pageviews, bounce rate, duration), realtime dashboard, **3D globe view (globe.gl / three.js)** with 3-level location drill-down (country/region/city), session replay (30-day retention), funnels (shipped in OSS - a deliberate differentiator vs Plausible CE), goals, user journeys, retention, error tracking, Web Vitals (LCP, CLS, INP, FCP), user profiles with full session/event history, custom events with JSON properties, advanced filtering across 15+ dimensions, date-range comparison vs previous period, automatic bot filtering, UTM capture, organizations/multi-site support, email reports, data export, API access. Cloud pricing: free tier (~3k pageviews/mo), Standard $13/mo (100k pageviews, 5 sites, 3 team members), Pro $26/mo (unlimited sites/members, replays, 5-year retention). Onboarding: one script line or `@rybbit/js` npm package, 40+ platform integration guides.

Privacy model: cookieless, but uses **localStorage persistent visitor IDs** (enables cross-session retention; HN commenters flagged this as legally weaker than Plausible's stateless model under ePrivacy). Sessions via daily-rotating salted IP hash, GeoLite2 geolocation, EU cloud hosting.

Known weaknesses to improve on: tracking script is heavy for the category (~9.3KB transfer / 26KB decoded vs Plausible 1.9/2.9KB, Fathom 3.0/6.7KB, Umami 3.2/4.5KB); launched without a server-side ingestion API or `identify()` call; bot filtering weaker than Umami at launch; CDN-served script is on ad-blocker blocklists; young solo project (polish gaps).

### Sleek (getsleek.io) - secondary inspiration

Very early-stage solo product (Show HN April 2026, minimal traction) targeting indie makers, positioned on price and a modern-feeling UI. Feature claims from its site/docs (mostly unverified by third parties, treat as directional): sub-2KB async cookieless script (`https://getsleek.io/v1.js` with `data-site`), anonymous fingerprint from browser signals, EU data storage, live visitors = active in last 5 minutes, auto Web Vitals (LCP, CLS, FCP, TTFB), visitor profiles with session journeys, **public read-only dashboards**, **weekly digest reports**, **AI chat over analytics data**, **revenue attribution via Stripe/Polar/Dodo/Paddle/Lemon Squeezy integrations**, `window.analytics.track(name, props)` event API, Plausible ZIP import, public Data API, `npx sleek-analytics init` CLI onboarding. Pricing: event-based tiers ($9/50k, $19/500k, $49/2M events; also seen $5/50k), 3-day trial, no card.

What to take: the *ideas* (revenue attribution, AI chat, digests, event-based pricing clarity) and the lightweight script bar. What to avoid: its shallow data depth (no drill-down, no funnels/goals documented - its one substantive HN comment asked for exactly that).

### Industry best practices worth adopting (verified)

- **Plausible filtering UX**: every row in every breakdown card is click-to-filter; filters stack; a Filter button adds operators (is / is not / contains / does not contain) with multi-select and type-ahead; active filter pills at top, Esc clears; saved segments in two tiers (personal vs site-visible).
- **Plausible comparison UX**: Compare button (keyboard shortcut X); modes = previous period, year-over-year, custom period; "match day of week" vs "match exact date" alignment; comparison renders as second chart line + % deltas on metric cards + hover tooltips on breakdown rows; preference persisted.
- **Plausible dashboard shape**: single unified dashboard, six switchable top-graph metrics via clickable metric cards, realtime entered by clicking the live-visitor count, 30s refresh.
- **Plausible privacy architecture**: daily hash of IP + UA + rotating salt purged every 24h; raw IP/UA never stored; query params stripped except UTM; the reference standard for "no consent banner" claims.
- **PostHog funnels**: ordering modes (sequential / strict / any order), exclusion steps, three visualizations (steps, time-to-convert, trend over time), click a step to see converted/dropped users and save as cohort.
- **PostHog retention**: cohort modes (first-time / first-ever / recurring), hour/day/week/month intervals, % relative to cohort or previous period, drillable cells opening the user list, breakdowns.
- **PostHog replay architecture**: rrweb full+incremental DOM snapshots, blob storage (S3) for payloads with metadata in the analytics DB, TTL-based retention - the pattern to follow if/when replay ships.

## Product strategy for WebSight

1. **Positioning**: "Rybbit-class features with Plausible-class weight and polish." Cookieless, no consent banner, one clean dashboard, but with sessions, funnels, goals, journeys, retention, Web Vitals, and errors that Plausible-class tools lack.
2. **Beat the inspirations where they are weak**: script under 3KB gzipped (Rybbit is ~9KB); server-side ingestion API + `identify()` from day one (Rybbit launched without both); privacy mode selectable per site (stateless Plausible-style vs persistent Rybbit-style) - nobody offers this choice; first-class dark mode; revenue attribution (Sleek's best idea, absent in Rybbit).
3. **Architecture principle**: unified wide `events` table + server-side sessionization + incremental aggregates on Postgres now, with the query layer isolated behind one module so ClickHouse can replace it at scale without touching the UI (Rybbit validates ClickHouse as the endgame).
4. **UI principle**: extend the shipped emerald landing system into the app (kill the old dark/indigo authed pages); sidebar shell per `design/WebSight.dc.html`; JetBrains Mono for all numbers; click-to-filter everywhere; every screen designed with empty, loading, and error states.

## Plan index and recommended build order

| Phase | File | System |
|---|---|---|
| 1 | `01-tracking-sdk.md` | New tracking script + npm SDK |
| 1 | `02-ingestion-and-data-model.md` | Unified events pipeline, sessions, rollups |
| 1 | `03-dashboard-shell-and-design-system.md` | App shell, nav, dark mode, theme migration |
| 2 | `04-overview-dashboard.md` | Core metrics, chart, breakdown cards |
| 2 | `05-filtering-and-segmentation.md` | Click-to-filter, operators, saved segments |
| 2 | `06-realtime-and-globe.md` | Realtime view + 3D globe |
| 3 | `07-sessions-and-user-profiles.md` | Session list, session detail, profiles |
| 3 | `08-goals-and-conversions.md` | Goals CRUD + conversion reporting |
| 3 | `09-funnels.md` | Multi-step funnels |
| 3 | `10-user-journeys.md` | Path/Sankey exploration |
| 3 | `11-retention.md` | Cohort retention grid |
| 4 | `12-web-vitals.md` | Performance monitoring |
| 4 | `13-error-tracking.md` | JS error capture and grouping |
| 4 | `14-custom-events.md` | Event API v2 with JSON properties |
| 4 | `24-session-replay.md` | rrweb session replay: capture, storage, player |
| 5 | `15-public-dashboards-and-sharing.md` | Public/password share links |
| 5 | `16-organizations-and-team.md` | Orgs, members, roles |
| 5 | `17-onboarding.md` | Site setup wizard, integration guides |
| 5 | `18-billing-and-pricing.md` | Stripe billing, usage metering |
| 5 | `19-reports-and-exports.md` | Email digests, CSV export, data API |
| 6 | `20-ai-insights.md` | AI chat over analytics |
| 6 | `21-revenue-attribution.md` | Stripe/payment provider attribution |

Phase 1 is the foundation everything else sits on; within later phases files are independent and parallelizable.

**Implementing? Start with `22-next-steps.md`** - the handoff doc with current repo state, concrete first tasks, working agreements, and a status tracker.
