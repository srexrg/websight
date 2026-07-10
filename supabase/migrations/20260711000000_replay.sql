-- Plan 24 milestone 1: session replay metadata.
-- Replay payloads (rrweb event chunks) live in an S3-compatible object store;
-- these tables hold one row per recording and one per stored chunk, joined to
-- the plan-02 sessions table. Service-role only (RLS on, zero policies), the
-- same posture as events/sessions.

create table public.replay_recordings (
    id uuid primary key,
    site_id uuid not null references public.sites(id) on delete cascade,
    session_id uuid,
    visitor_id text not null,
    started_at timestamptz not null default now(),
    last_activity_at timestamptz not null default now(),
    duration_s int generated always as
        (greatest(0, extract(epoch from (last_activity_at - started_at))::int)) stored,
    page_count int not null default 1,
    chunk_count int not null default 0,
    bytes bigint not null default 0,
    entry_path text,
    device_type text,
    browser text,
    os text,
    country char(2),
    status text not null default 'active' check (status in ('active','complete','expired')),
    expires_at timestamptz not null,
    created_at timestamptz not null default now()
);

create index replay_recordings_site_started_idx
    on public.replay_recordings (site_id, started_at desc, id desc);
create index replay_recordings_session_idx
    on public.replay_recordings (session_id) where session_id is not null;
create index replay_recordings_expiry_idx
    on public.replay_recordings (expires_at) where status <> 'expired';
create index replay_recordings_stale_idx
    on public.replay_recordings (last_activity_at) where status = 'active';
create index replay_recordings_site_visitor_idx
    on public.replay_recordings (site_id, visitor_id);

create table public.replay_chunks (
    recording_id uuid not null references public.replay_recordings(id) on delete cascade,
    seq int not null check (seq >= 0 and seq <= 500),
    storage_path text not null,
    bytes int not null,
    gz boolean not null default true,
    created_at timestamptz not null default now(),
    primary key (recording_id, seq)
);

alter table public.replay_recordings enable row level security;
alter table public.replay_chunks enable row level security;
revoke all on public.replay_recordings from public, anon, authenticated;
revoke all on public.replay_chunks from public, anon, authenticated;

-- Keyset-paginated replays list, filter-aware via the plan-05 model. Filters
-- are event-scoped, so a recording matches when its linked session has an
-- event satisfying the filter WHERE (same pattern as analytics_sessions_list).
create or replace function public.analytics_replays_list(
    p_site uuid,
    p_from timestamptz,
    p_to timestamptz,
    p_cursor_started timestamptz default null,
    p_cursor_id uuid default null,
    p_limit int default 50,
    p_filters jsonb default '[]'::jsonb
) returns table (
    id uuid,
    session_id uuid,
    visitor_id text,
    user_id text,
    started_at timestamptz,
    duration_s int,
    page_count int,
    chunk_count int,
    bytes bigint,
    entry_path text,
    device_type text,
    browser text,
    os text,
    country text,
    status text,
    is_open boolean
)
language plpgsql stable
security definer
set search_path = public
as $$
declare
    w text := public._analytics_where(p_filters);
    v_limit int := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
    if w = 'true' then
        return query
            select r.id, r.session_id, r.visitor_id, s.user_id,
                   r.started_at, r.duration_s, r.page_count, r.chunk_count,
                   r.bytes, r.entry_path, r.device_type, r.browser, r.os,
                   r.country::text, r.status, coalesce(s.is_open, false)
            from public.replay_recordings r
            left join public.sessions s on s.id = r.session_id
            where r.site_id = p_site
              and r.started_at >= p_from and r.started_at < p_to
              and (p_cursor_started is null
                   or (r.started_at, r.id) < (p_cursor_started, p_cursor_id))
            order by r.started_at desc, r.id desc
            limit v_limit;
        return;
    end if;

    return query execute format($q$
        select r.id, r.session_id, r.visitor_id, s.user_id,
               r.started_at, r.duration_s, r.page_count, r.chunk_count,
               r.bytes, r.entry_path, r.device_type, r.browser, r.os,
               r.country::text, r.status, coalesce(s.is_open, false)
        from public.replay_recordings r
        left join public.sessions s on s.id = r.session_id
        where r.site_id = $1 and r.started_at >= $2 and r.started_at < $3
          and ($4::timestamptz is null or (r.started_at, r.id) < ($4, $5))
          and r.session_id in (
              select e.session_id from public.events e
              where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3
                and e.session_id is not null and %s
          )
        order by r.started_at desc, r.id desc
        limit $6
    $q$, w) using p_site, p_from, p_to, p_cursor_started, p_cursor_id, v_limit;
end;
$$;

revoke all on function public.analytics_replays_list(uuid, timestamptz, timestamptz, timestamptz, uuid, int, jsonb) from public, anon, authenticated;
grant execute on function public.analytics_replays_list(uuid, timestamptz, timestamptz, timestamptz, uuid, int, jsonb) to service_role;

-- analytics_sessions_list gains has_replay so session rows can show a play icon.
drop function if exists public.analytics_sessions_list(uuid, timestamptz, timestamptz, timestamptz, uuid, int, jsonb);

create or replace function public.analytics_sessions_list(
    p_site uuid,
    p_from timestamptz,
    p_to timestamptz,
    p_cursor_started timestamptz default null,
    p_cursor_id uuid default null,
    p_limit int default 50,
    p_filters jsonb default '[]'::jsonb
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
    has_replay boolean
)
language plpgsql stable
security definer
set search_path = public
as $$
declare
    w text := public._analytics_where(p_filters);
    v_limit int := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
    if w = 'true' then
        -- Fast path: no filters, pure index scan on sessions.
        return query
            select s.id, s.visitor_id, s.user_id, s.started_at, s.last_event_at,
                   s.duration_s, s.entry_path, s.exit_path, s.pageviews, s.events,
                   s.is_bounce, s.is_open, s.referrer_domain, s.channel,
                   s.country::text, s.region, s.city, s.device_type, s.browser, s.os,
                   exists(select 1 from public.replay_recordings rr where rr.session_id = s.id and rr.status <> 'expired') as has_replay
            from public.sessions s
            where s.site_id = p_site
              and s.started_at >= p_from and s.started_at < p_to
              and (p_cursor_started is null
                   or (s.started_at, s.id) < (p_cursor_started, p_cursor_id))
            order by s.started_at desc, s.id desc
            limit v_limit;
        return;
    end if;

    return query execute format($q$
        select s.id, s.visitor_id, s.user_id, s.started_at, s.last_event_at,
               s.duration_s, s.entry_path, s.exit_path, s.pageviews, s.events,
               s.is_bounce, s.is_open, s.referrer_domain, s.channel,
               s.country::text, s.region, s.city, s.device_type, s.browser, s.os,
               exists(select 1 from public.replay_recordings rr where rr.session_id = s.id and rr.status <> 'expired') as has_replay
        from public.sessions s
        where s.site_id = $1 and s.started_at >= $2 and s.started_at < $3
          and ($4::timestamptz is null or (s.started_at, s.id) < ($4, $5))
          and s.id in (
              select e.session_id from public.events e
              where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3
                and e.session_id is not null and %s
          )
        order by s.started_at desc, s.id desc
        limit $6
    $q$, w) using p_site, p_from, p_to, p_cursor_started, p_cursor_id, v_limit;
end;
$$;

revoke all on function public.analytics_sessions_list(uuid, timestamptz, timestamptz, timestamptz, uuid, int, jsonb) from public, anon, authenticated;
grant execute on function public.analytics_sessions_list(uuid, timestamptz, timestamptz, timestamptz, uuid, int, jsonb) to service_role;
