-- Plan 07 milestone 3: User Profiles.
-- A profile is the lifetime aggregate of one visitor's sessions (persistent
-- mode / identified users). Lifetime metrics are computed from `sessions` at
-- read time; the `profiles` table only stores identity + identify() traits,
-- maintained by an exception-safe trigger so profile upkeep can never break
-- event ingestion.

create table if not exists public.profiles (
    site_id uuid not null,
    visitor_id text not null,
    user_id text,
    traits jsonb not null default '{}'::jsonb,
    first_seen timestamptz not null default now(),
    last_seen timestamptz not null default now(),
    primary key (site_id, visitor_id)
);
alter table public.profiles enable row level security;  -- service_role RPCs bypass; no anon access

-- Fast per-visitor session aggregation (profiles list/detail).
create index if not exists sessions_site_visitor_started_idx
    on public.sessions (site_id, visitor_id, started_at desc);

-- Maintain identity/traits from identified events. Wrapped so a failure here
-- never aborts the event insert.
create or replace function public.profiles_upsert_from_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.user_id is null and new.name <> 'identify' then
        return new;
    end if;
    begin
        insert into public.profiles as p (site_id, visitor_id, user_id, traits, first_seen, last_seen)
        values (
            new.site_id, new.visitor_id, new.user_id,
            case when new.name = 'identify' and jsonb_typeof(new.props) = 'object'
                 then new.props else '{}'::jsonb end,
            new.created_at, new.created_at
        )
        on conflict (site_id, visitor_id) do update set
            user_id = coalesce(excluded.user_id, p.user_id),
            traits = p.traits || excluded.traits,
            first_seen = least(p.first_seen, excluded.first_seen),
            last_seen = greatest(p.last_seen, excluded.last_seen);
    exception when others then
        null; -- profile maintenance must never break ingestion
    end;
    return new;
end;
$$;

drop trigger if exists events_profiles_upsert on public.events;
create trigger events_profiles_upsert
    after insert on public.events
    for each row execute function public.profiles_upsert_from_event();

-- ---------------------------------------------------------------- read RPCs

-- Profiles list: lifetime aggregate per identity (user_id when set, else
-- visitor_id), newest-active first, with optional id/user search.
create or replace function public.analytics_profiles_list(
    p_site uuid,
    p_search text default null,
    p_limit int default 50,
    p_offset int default 0
) returns table (
    profile_key text,
    visitor_id text,
    user_id text,
    traits jsonb,
    sessions bigint,
    pageviews bigint,
    first_seen timestamptz,
    last_seen timestamptz,
    top_country text,
    top_device text
)
language sql stable
security definer
set search_path = public
as $$
    with agg as (
        select
            coalesce(nullif(s.user_id, ''), s.visitor_id) as profile_key,
            (array_agg(s.visitor_id order by s.started_at desc))[1] as visitor_id,
            max(s.user_id) as user_id,
            count(*) as sessions,
            sum(s.pageviews) as pageviews,
            min(s.started_at) as first_seen,
            max(s.last_event_at) as last_seen,
            mode() within group (order by s.country) as top_country,
            mode() within group (order by s.device_type) as top_device
        from public.sessions s
        where s.site_id = p_site
        group by 1
    )
    select a.profile_key, a.visitor_id, a.user_id,
           coalesce(p.traits, '{}'::jsonb) as traits,
           a.sessions, a.pageviews, a.first_seen, a.last_seen,
           a.top_country::text, a.top_device
    from agg a
    left join public.profiles p on p.site_id = p_site and p.visitor_id = a.visitor_id
    where p_search is null or p_search = ''
       or coalesce(a.user_id, '') ilike '%' || p_search || '%'
       or a.visitor_id ilike '%' || p_search || '%'
    order by a.last_seen desc
    limit least(greatest(coalesce(p_limit, 50), 1), 100)
    offset greatest(coalesce(p_offset, 0), 0);
$$;

-- One profile's lifetime aggregate + traits.
create or replace function public.analytics_profile_detail(
    p_site uuid,
    p_key text
) returns table (
    profile_key text,
    visitor_id text,
    user_id text,
    traits jsonb,
    sessions bigint,
    pageviews bigint,
    first_seen timestamptz,
    last_seen timestamptz,
    top_country text,
    top_device text
)
language sql stable
security definer
set search_path = public
as $$
    with agg as (
        select
            coalesce(nullif(s.user_id, ''), s.visitor_id) as profile_key,
            (array_agg(s.visitor_id order by s.started_at desc))[1] as visitor_id,
            max(s.user_id) as user_id,
            count(*) as sessions,
            sum(s.pageviews) as pageviews,
            min(s.started_at) as first_seen,
            max(s.last_event_at) as last_seen,
            mode() within group (order by s.country) as top_country,
            mode() within group (order by s.device_type) as top_device
        from public.sessions s
        where s.site_id = p_site
          and coalesce(nullif(s.user_id, ''), s.visitor_id) = p_key
        group by 1
    )
    select a.profile_key, a.visitor_id, a.user_id,
           coalesce(p.traits, '{}'::jsonb) as traits,
           a.sessions, a.pageviews, a.first_seen, a.last_seen,
           a.top_country::text, a.top_device
    from agg a
    left join public.profiles p on p.site_id = p_site and p.visitor_id = a.visitor_id;
$$;

-- Sessions belonging to one profile (newest first).
create or replace function public.analytics_profile_sessions(
    p_site uuid,
    p_key text,
    p_limit int default 50
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
    os text
)
language sql stable
security definer
set search_path = public
as $$
    select s.id, s.visitor_id, s.user_id, s.started_at, s.last_event_at,
           s.duration_s, s.entry_path, s.exit_path, s.pageviews, s.events,
           s.is_bounce, s.is_open, s.referrer_domain, s.channel,
           s.country::text, s.region, s.city, s.device_type, s.browser, s.os
    from public.sessions s
    where s.site_id = p_site
      and coalesce(nullif(s.user_id, ''), s.visitor_id) = p_key
    order by s.started_at desc, s.id desc
    limit least(greatest(coalesce(p_limit, 50), 1), 200);
$$;

-- Event-name frequency for one profile.
create or replace function public.analytics_profile_event_freq(
    p_site uuid,
    p_key text,
    p_limit int default 20
) returns table (name text, count bigint)
language sql stable
security definer
set search_path = public
as $$
    select e.name, count(*) as count
    from public.events e
    where e.site_id = p_site
      and e.session_id in (
          select s.id from public.sessions s
          where s.site_id = p_site
            and coalesce(nullif(s.user_id, ''), s.visitor_id) = p_key
      )
    group by e.name
    order by count desc, e.name
    limit least(greatest(coalesce(p_limit, 20), 1), 100);
$$;

revoke all on function public.analytics_profiles_list(uuid, text, int, int) from public, anon, authenticated;
revoke all on function public.analytics_profile_detail(uuid, text) from public, anon, authenticated;
revoke all on function public.analytics_profile_sessions(uuid, text, int) from public, anon, authenticated;
revoke all on function public.analytics_profile_event_freq(uuid, text, int) from public, anon, authenticated;
grant execute on function public.analytics_profiles_list(uuid, text, int, int) to service_role;
grant execute on function public.analytics_profile_detail(uuid, text) to service_role;
grant execute on function public.analytics_profile_sessions(uuid, text, int) to service_role;
grant execute on function public.analytics_profile_event_freq(uuid, text, int) to service_role;
