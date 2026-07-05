# 22 - Next Steps: Implementation Handoff

> **Who this is for**: the next agent (or developer) picking up the WebSight redesign. The research and planning phase is complete. This file tells you exactly what exists, what to read, what to build first, and how to work. Start here.

## Current state of the repo

- Branch `revamp/foundation-landing` carries the new emerald landing page (already built: `components/landing/*`, `lib/landing/content.ts`, interactive 3D globe). Nothing from the redesign plans has been implemented yet.
- The **old product is still live and untouched**: `public/tracker.js` -> `app/api/track/route.ts` -> `visits`/`page_views`/`daily_stats` tables, dashboard at `app/(root)/website/[domain]` via `components/analytics/AnalyticsClient.tsx` and `lib/actions/analytics.ts`.
- Package manager is **npm** (`package-lock.json`). There is **no `supabase/` directory** - all existing SQL (tables, RPCs like the analytics aggregate functions) lives only in the Supabase dashboard. Recovering it into version-controlled migrations is part of the first task.
- The 8-screen dashboard mock to build toward is `design/WebSight.dc.html`; tokens and rules in `design/design-system.md` and `app/globals.css`.
- All 22 plan files live in `docs/redesign/`. Read `00-research-and-strategy.md` first for shared context, then only the plan you are implementing - each is self-contained.
- **Infrastructure decision made** (`23-infrastructure-decision.md`): stay on Supabase; do not migrate. Native partitioning + pg_cron (pg_partman is NOT available on Supabase - do not use it), add query-timing logs in `queries.ts`, and revisit a ClickHouse split only for the events store if the triggers in `23` fire.

## Build order

Phase 1 is strictly sequential-ish and everything else depends on it. Recommended order **02 -> 01 -> 03**:

1. **`02-ingestion-and-data-model.md`** - the foundation. New `sites`, `salts`, `events`, `sessions`, `rollup_daily` schema, the atomic `ingest_event` RPC, and `lib/analytics/queries.ts` as the single query choke point. Nothing else can merge before this.
2. **`01-tracking-sdk.md`** - the new `<3KB` tracker in `packages/tracker/`, built against the `02` payload schema and ingest endpoint.
3. **`03-dashboard-shell-and-design-system.md`** - the sidebar app shell, route restructure to `app/(app)/[site]/(dashboard)/*`, dark mode, TanStack Query + nuqs. This creates the frame every Phase 2+ screen mounts into.

After Phase 1, files within a phase are independent and parallelizable. Sensible next sprint: `04` (overview) + `05` (filters) together - they share components and `05`'s filter model must be in `04`'s fetchers from the start.

## Step 0 - Dependency refresh & upgrade policy (decided 2026-07-03)

Checked via `npm outdated`. The core stack is already on the latest majors - Next.js 16.2, React 19.2, TypeScript 6, Tailwind v4.3, ESLint flat config - so **no framework migration is needed**. Policy going forward: the redesign is built on latest stable everything; run `npm outdated` at the start of each phase and take minors/patches immediately, majors deliberately. New dependencies introduced by the plans are always added at their latest stable version.

Concrete actions, ordered (do 1-3 before starting plan `02` code, the rest land inside the plans noted):

1. **Safe sweep now**: `npm update` for all minor/patch drift (Next 16.2.10, Tailwind 4.3.2, Radix, framer-motion 12.42, ua-parser-js, date-fns, tailwind-merge, eslint-config-next, etc.). Verify `npm run build`.
2. **Supabase clients** (drifted badly): `@supabase/supabase-js` 2.49 -> 2.110 and `@supabase/ssr` 0.6 -> 0.12. The 0.x ssr jump can change cookie handling - touches `utils/supabase/*` and `middleware.ts`; verify the Google login flow end-to-end after. Must happen before any new auth-adjacent code is written.
3. **ESLint 9 -> 10**: flat config is already in place, low risk.
4. **Recharts 2 -> 3** (major): upgrade now and build every new dashboard component (`03`/`04`+) on v3 from day one - do not build new UI on v2 and migrate later. Only 3 legacy files use it (`components/ui/chart.tsx`, `AnalyticsOverview.tsx`, `PageAnalytics.tsx`); patch them minimally since they're retired at the end of Phase 1 anyway.
5. **Node types**: `@types/node` is 20 but local Node is 25. Pin `"engines"` in package.json to the version the deploy target runs (Vercel: check project setting, likely 22 LTS), and match `@types/node` to it - don't blindly jump to 26.
6. **Icon consolidation** (during `03` theme migration): the repo ships three icon libraries. Phosphor is the standard (`components.json`, landing page); remove `lucide-react` (~13 files: shadcn ui defaults + old authed pages, all being restyled in `03` anyway) and `react-icons` (1 file: `login-button.tsx`).
7. **Don't upgrade, remove**: `jspdf`/`jspdf-autotable` (2.x, latest 4.x) go away when `19` retires PDF export - if `03`'s restructure orphans them earlier, delete earlier. `react-syntax-highlighter` (15 -> 16): replace with `shiki` during the `17` docs/MDX revamp instead of upgrading.
8. `@vercel/analytics` 1 -> 2: trivial, take it in the sweep (and decide during `03` whether dogfooding WebSight makes it redundant).

## First task, concretely (start of plan 02)

1. Initialize migrations: create `supabase/migrations/` (Supabase CLI), and snapshot the **existing** schema (tables + the RPCs currently only in the dashboard) as migration `0000_baseline` so the old system is reproducible before touching anything.
2. Migration `0001`: the new schema from `02` (sites, salts, events partitioned by month, sessions, rollup_daily) plus the `ingest_event` RPC and pg_cron salt rotation.
3. New ingest route (per `02`) writing through `ingest_event`. Keep the old `/api/track` running - **dual-write from the old route into the new tables** during transition so no data is lost and the new dashboard has history from day one.
4. Backfill `visits`/`page_views`/`daily_stats` history into `events`/`sessions`/`rollup_daily` (script spec is in `02`).
5. Implement `lib/analytics/queries.ts` with the first two fetchers (metrics + timeseries) and prove them against backfilled data.

Do not cut over or delete anything old until `03`'s shell renders the new overview from the new tables. Old dashboard removal is the *last* step of Phase 1, not the first.

## Working agreements

- **Branches**: one branch per plan file, named `redesign/02-ingestion`, `redesign/01-tracker`, etc., PRs into `main` (or into a long-running `redesign` integration branch if `main` must stay deployable - decide with the user at kickoff).
- **Milestones are the unit of work**: every plan ends with numbered Development milestones; implement and verify them in order. A plan is "done" when all its milestones pass, its edge-case list has been walked, and `npm run build` + lint are clean.
- **Schema changes only via `supabase/migrations/`** from now on - never the dashboard.
- **Design rules**: emerald `#0E9C6E`, Hanken Grotesk for UI, JetBrains Mono for every number, light + dark from the tokens in `app/globals.css`. No em-dashes in any user-facing copy (user preference: plain dashes).
- **Every screen ships with empty, loading, and error states** - the plans call this out repeatedly; treat it as a merge requirement.
- **Cross-plan references**: plans cite each other by number (e.g. "the `05` URL codec"). If you implement out of order and hit a dependency, stub behind an interface and note it in this file rather than pulling the whole other plan forward.

## Environment / accounts needed along the way

- Now (Phase 1): Supabase project access (already in `.env.local`), Supabase CLI, pg_cron enabled.
- Later: Resend key (`16`/`19`), Stripe account + `BILLING_ENABLED` (`18`), `ANTHROPIC_API_KEY` (`20`), payment-provider test accounts (`21`). Each plan lists its own env vars.

## Known caveats from the research phase

- Rybbit/Plausible/PostHog findings in the plans were adversarially verified; **Sleek claims are site-sourced and directional only** - don't treat Sleek feature descriptions as ground truth if you go re-research.
- Refuted claims already excluded: Rybbit's "18KB script" (real figure ~9.3KB transfer/26KB decoded), Rybbit RBAC/password-protected sharing (our `15`/`16` designs are original, not copied fact).

## Status tracker

Update this table as work proceeds so any future agent knows where things stand.

| Plan | Status | Branch / PR | Notes |
|---|---|---|---|
| Step 0 deps refresh | **done** (2026-07-03) | `redesign/02-ingestion` | items 1-3 done. ESLint stays on 9: `eslint-config-next` 16.2.10 bundles an `eslint-plugin-react` that crashes under ESLint 10 (`getFilename` removed) - retry when Next ships compat. `@supabase/ssr` 0.12 verified compiling + building; Google login flow still needs a manual e2e check against prod before deploy. |
| 01 tracking-sdk | **milestones 1-4 done** (2026-07-05) | `redesign/01-tracker` | `packages/tracker` -> `public/t.js` (tsup IIFE, **1.8KB gzipped** vs 3KB budget, enforced by a test) + lazy `public/t-x.js` (web-vitals + error capture, loaded only with `data-vitals`/`data-errors`). Full feature set: SPA pageviews (history patch + dedupe), batched sendBeacon/fetch transport (first event flushes immediately), outbound/download/form/`data-ws-event` auto-capture, `websight.track/identify` + pre-init stub queue, stateless/persistent modes, client-side query stripping (utm/click-ids kept), localhost + `websight_ignore` + opt-in DNT guards, prerender/bfcache handling. 19 jsdom unit tests run the BUILT bundle; `tests/integration/sdk.test.ts` replays real beacons through the route into the DB. Snippet modal + self-tracking switched to `/t.js` (`prebuild` regenerates). Legacy `public/tracker.js` left untouched - switching embedded sites to `/t.js` stops legacy-table writes, so migrate embeds only after `03` renders from new tables. **Remaining**: milestone 5 (`@websight/js` npm publish, proxy recipe docs, per-framework docs tabs). |
| 02 ingestion-and-data-model | **milestones 1-4 done** (2026-07-03) | `redesign/02-ingestion` | Migrations `0000` (legacy baseline reconstruction) + `0001` (sites/salts/events/sessions/rollup_daily, `ingest_event`, read RPCs, pg_cron jobs). New `/api/track` handles v2 batches + legacy dual-write; `/api/events` dual-writes sessionless. `lib/analytics/queries.ts` (overview/timeseries/breakdown) proven against backfilled data. `scripts/backfill.ts` written + verified. **Deployed to prod 2026-07-05**: migrations applied, pg_cron jobs active, backfill run, 40 tests green against the cloud project (integration tests target `.env.local` cloud creds, local stack as fallback). **Remaining**: Vercel env vars + app deploy (see notes below); milestone 5 (rate limiting, per-site origin validation, monitoring); cut-over/retire old tables waits for `03`. |
| 03 dashboard-shell | not started | - | |
| 04-21 | not started | - | blocked on Phase 1 |

### Deploy notes for `02` (prod rollout)

**Done on prod 2026-07-05**: project linked, baseline repaired as applied, `0001` pushed (pg_cron enabled, all three `ws-*` jobs active), backfill run (4,576 events / 2,321 sessions / 702 rollup days from 23 sites), parity spot-checked vs `daily_stats` (matches; where they differ the legacy numbers were undercounts from the non-atomic old route), full 40-test suite green against the cloud project. The project uses the **new API key system** (`sb_publishable_...` / `sb_secret_...`); all clients accept the new env names `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY` with the legacy names as fallback. Found on prod and folded back into the baseline migration: `public.users.id` references `auth.users(id)` and `users.email` is unique.

**Still to do at app deploy time**:

1. Set `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` in the Vercel env (the legacy JWT anon key is rejected by the project - if legacy keys were disabled, the currently deployed app cannot reach Supabase until this lands).
2. Deploy the app promptly after the migration (already applied): the deployed old code references the `events` table, which is now `events_legacy`, so the custom-events API/tab is broken until deploy (feature last used 2025-04, impact negligible).
3. Manual e2e of the Google login flow after the `@supabase/ssr` 0.12 + publishable-key switch.
