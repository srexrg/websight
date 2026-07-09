-- Globe: per-visitor live faces + click-to-details.
--
-- Adds nullable city-level coordinates on sessions (populated at ingest from CDN
-- geo headers in a later change; null-tolerant so the globe falls back to country
-- centroids until then) and a read-only RPC returning the sessions active in the
-- last N minutes, so each active visitor can render as one clickable avatar.

alter table public.sessions add column if not exists lat real;
alter table public.sessions add column if not exists lng real;

-- Active sessions for the live globe: one row per session seen in the last N
-- minutes, newest activity first. Uses the existing (site_id, last_event_at)
-- index from the realtime migration.
create or replace function public.analytics_live_sessions(
    p_site uuid,
    p_minutes int default 5,
    p_limit int default 80
) returns table (
    id uuid,
    visitor_id text,
    user_id text,
    started_at timestamptz,
    last_event_at timestamptz,
    duration_s int,
    entry_path text,
    exit_path text,
    pageviews int,
    events int,
    is_bounce boolean,
    is_open boolean,
    referrer_domain text,
    channel text,
    country text,
    region text,
    city text,
    device_type text,
    browser text,
    os text,
    lat real,
    lng real
)
language sql
stable
security definer
set search_path = public
as $$
    select s.id, s.visitor_id, s.user_id, s.started_at, s.last_event_at,
           s.duration_s, s.entry_path, s.exit_path, s.pageviews, s.events,
           s.is_bounce, s.is_open, s.referrer_domain, s.channel,
           s.country::text, s.region, s.city, s.device_type, s.browser, s.os,
           s.lat, s.lng
    from public.sessions s
    where s.site_id = p_site
      and s.last_event_at > now() - make_interval(mins => least(greatest(p_minutes, 1), 60))
    order by s.last_event_at desc
    limit least(greatest(coalesce(p_limit, 80), 1), 200);
$$;

revoke all on function public.analytics_live_sessions(uuid, int, int) from public, anon, authenticated;
grant execute on function public.analytics_live_sessions(uuid, int, int) to service_role;
