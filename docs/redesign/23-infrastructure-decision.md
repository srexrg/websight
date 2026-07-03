# 23 - Infrastructure Decision: Stay on Supabase (for now)

> **Decision (2026-07-03)**: Do NOT migrate off Supabase. Build Phase 1 on Supabase Postgres exactly as planned in `02`. The only migration ever on the table is moving the **analytics events store** to ClickHouse later - and even then Supabase stays for auth and app data (the exact split Rybbit runs: Postgres for app data, ClickHouse for events). Concrete triggers for that split are defined below so the decision is data-driven, not vibes-driven.

## What we actually depend on Supabase for

Checked in the codebase: `@supabase/supabase-js` + `@supabase/ssr` used in `utils/supabase/{client,server,middleware}.ts`, `middleware.ts`, `app/api/{track,events,auth/callback}/route.ts`, and `lib/actions/analytics.ts`. That is:

1. **Auth** - Google OAuth via Supabase Auth (GoTrue) with SSR cookie handling. The sticky part of any migration, and it works.
2. **Postgres** - all data. Accessed via PostgREST (supabase-js), plus dashboard-only RPCs (being moved into `supabase/migrations/` per `22`).
3. Planned dependencies from the redesign: RLS (`16`), `pg_cron` (`02`, `18`), optionally Vault (`21`).

There is no Storage/Realtime/Edge-Functions dependency. So "Supabase" for us = managed Postgres + managed auth. Lock-in is low: everything except auth is plain Postgres, and with migrations version-controlled the schema is portable to any Postgres host in an afternoon. Auth being Google-OAuth-only (no passwords) makes even that portable later.

## Why staying is right

- **Scale math**: a wide `events` row (~30 columns + jsonb) is roughly 0.5-1KB with indexes. 1M events/month is ~0.5-1GB/month of growth. Supabase Pro ($25/mo) includes 8GB disk, overage at $0.125/GB/month - 100GB of events would cost ~$12/mo in disk. Egress is aggregates only (dashboards return rollups, not raw rows), nowhere near the 250GB included. Cost does not force a move at any scale this product will see in the next year.
- **Postgres is enough for the query patterns**: `02`'s design already assumes it - `rollup_daily` serves the overview/timeseries hot path, monthly partitions + BRIN/btree indexes serve filtered raw-event queries, and only funnels/journeys/retention do heavy session scans. This is comfortable into the low hundreds of millions of events.
- **Compute is a knob, not a wall**: before any migration, Supabase compute scales from Micro (Pro's included credit) up through 16XL. First response to load is a compute add-on (~$15-60/mo range for Small-Large), not a re-platform.
- **The plans already hedge**: every read goes through `lib/analytics/queries.ts` (`02`) precisely so the events store can be swapped without touching UI. The hedge costs nothing now and makes the future migration a data move, not a rewrite.
- **Alternatives checked and rejected for now**:
  - *ClickHouse now* (Rybbit's stack): real ops + cost overhead (ClickHouse Cloud minimums, dual datastore, no RLS, separate backups) bought before there is traffic to justify it. Premature.
  - *Neon/other managed Postgres*: same database, loses auth, gains nothing we need.
  - *Self-hosted*: ops burden with zero product payoff for a solo/small team.

## Supabase-specific gotchas to build around (verified)

1. **`pg_partman` is NOT actually available** on Supabase despite their docs recommending it (open issue since May 2025). Irrelevant to us: `02` already uses **native** `PARTITION BY RANGE` with a `pg_cron` job creating next month's partition - do not introduce pg_partman.
2. **`pg_cron` is available** and is what `02` (salt rotation, partitions), `18` (usage metering), and `19` (digest option) assume. Enable it in the baseline migration.
3. **Ingest hot path**: supabase-js `.rpc('ingest_event')` goes through PostgREST - fine at launch volumes. If per-request overhead ever shows up in traces, switch the ingest route (and only it) to a direct `postgres.js` connection through the **Supavisor transaction pooler (port 6543)** - works fine from Vercel serverless. Batch events per request (the `01` tracker already batches) so one HTTP request = one RPC call = many events.
4. **Compute sizing**: the Pro plan's included Micro instance is small; expect to add a Small/Medium compute add-on once real traffic lands. Watch for connection/CPU pressure in the Supabase dashboard before blaming the architecture.

## Triggers for the ClickHouse split (revisit, don't pre-build)

Move **only the events/sessions store** to ClickHouse (Cloud) when ANY of these holds for 2+ consecutive weeks, after first trying a compute upgrade:

- Sustained ingest above **~5-10M events/month** across the platform, or the `events` table passes **~200M rows**.
- p95 of filtered dashboard queries (via `queries.ts` timing logs - add them in `02` milestone work) exceeds **~2s** with rollups already in place.
- Funnels/journeys/retention queries (`09`/`10`/`11`) need sampling below ~20% to stay interactive.

Migration shape when triggered: stand up ClickHouse, add a ClickHouse implementation behind `lib/analytics/queries.ts`, dual-write from `ingest_event`, backfill partitions oldest-first, flip reads per-query-family, drop Postgres event partitions after a validation window. Auth, app tables, RLS, billing all stay on Supabase untouched.

## What this means for the next agent

Nothing in `01`-`22` changes. Proceed with `22-next-steps.md` as written, plus two additions to carry into `02` implementation: (a) add query-timing logs in `queries.ts` so the split triggers are measurable, (b) enable `pg_cron` in the baseline migration and skip pg_partman.
