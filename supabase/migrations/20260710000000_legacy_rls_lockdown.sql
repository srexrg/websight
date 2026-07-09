-- Legacy-table RLS lockdown.
--
-- Audit (2026-07-10) found the five legacy/old-system tables reachable by the
-- public anon (publishable) key with RLS DISABLED, leaking real data:
--   users       (31 rows, INCLUDING EMAIL ADDRESSES)
--   domains      (24 rows, user_ids + domains)
--   visits       (2501 rows)
--   page_views   (4729 rows)
--   daily_stats  (767 rows)
-- The anon key ships in the client bundle, so this is world-readable.
-- Every v2 table (sites/events/sessions/profiles/... ) is already RLS-protected.
--
-- Fix: enable RLS and add owner-scoped policies. Writes from the ingestion route
-- use the service-role client (createAdminClient), which bypasses RLS, so
-- dual-write to visits/page_views/daily_stats keeps working. Authenticated users
-- keep read access to their own rows; anon gets nothing.

-- ── users: self access only ────────────────────────────────────────────────────
alter table public.users enable row level security;

drop policy if exists users_self_select on public.users;
create policy users_self_select on public.users
  for select to authenticated using (id = auth.uid());

drop policy if exists users_self_insert on public.users;
create policy users_self_insert on public.users
  for insert to authenticated with check (id = auth.uid());

drop policy if exists users_self_update on public.users;
create policy users_self_update on public.users
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ── domains: owner access (app writes via service role, bypasses RLS) ──────────
alter table public.domains enable row level security;

drop policy if exists domains_owner_all on public.domains;
create policy domains_owner_all on public.domains
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── visits / page_views / daily_stats: owner reads via domain ownership ────────
-- These are keyed by website_id = the domain string; ownership is domains.user_id.
-- Ingestion inserts via service role (RLS-exempt); anon is fully denied.
alter table public.visits enable row level security;
drop policy if exists visits_owner_select on public.visits;
create policy visits_owner_select on public.visits
  for select to authenticated
  using (website_id in (select domain from public.domains where user_id = auth.uid()));

-- page_views and daily_stats key on `domain` (not website_id).
alter table public.page_views enable row level security;
drop policy if exists page_views_owner_select on public.page_views;
create policy page_views_owner_select on public.page_views
  for select to authenticated
  using (domain in (select domain from public.domains where user_id = auth.uid()));

alter table public.daily_stats enable row level security;
drop policy if exists daily_stats_owner_select on public.daily_stats;
create policy daily_stats_owner_select on public.daily_stats
  for select to authenticated
  using (domain in (select domain from public.domains where user_id = auth.uid()));
