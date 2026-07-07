-- Plan 15: Public dashboards & sharing.
-- One share_tokens row per site: a URL-safe token grants read-only access to a
-- chosen subset of screens, optionally password-protected. Public routes resolve
-- the token to a site and run the SAME lib/analytics/queries.ts fetchers as the
-- member dashboard (no forked query paths), gated to exposed_screens.

create table if not exists public.share_tokens (
    id uuid primary key default gen_random_uuid(),
    site_id uuid not null unique references public.sites(id) on delete cascade,
    token text not null unique,
    visibility text not null default 'secret' check (visibility in ('secret', 'public')),
    password_hash text,
    exposed_screens jsonb not null default '["overview"]'::jsonb,
    hide_events boolean not null default true,
    created_by uuid,
    created_at timestamptz not null default now(),
    rotated_at timestamptz,
    last_accessed_at timestamptz
);
alter table public.share_tokens enable row level security;  -- owner routes + public token lookup go through service_role
create index if not exists share_tokens_token_idx on public.share_tokens (token);
