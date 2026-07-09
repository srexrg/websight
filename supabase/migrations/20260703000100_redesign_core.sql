-- 0001 REDESIGN CORE - unified events pipeline, sessions, rollups
--
-- Implements docs/redesign/02-ingestion-and-data-model.md:
--   * sites registry (promoted from legacy `domains`)
--   * daily salts for stateless visitor hashing
--   * wide `events` table, partitioned by month (legacy custom-events table
--     is renamed to `events_legacy`)
--   * server-side sessionization + atomic rollup_daily, all inside the
--     `ingest_event` RPC (one transaction per batch)
--   * read RPCs consumed only by lib/analytics/queries.ts
--   * pg_cron maintenance: salt rotation, partition creation, stale-session close

create extension if not exists pgcrypto;

do $$ begin
    create extension if not exists pg_cron;
exception when others then
    raise notice 'pg_cron unavailable (%). Scheduled jobs must be created manually.', sqlerrm;
end $$;

------------------------------------------------------------------------------
-- Legacy rename: the old custom-events table gives up the `events` name.
------------------------------------------------------------------------------

alter table if exists public.events rename to events_legacy;
alter index if exists events_website_created_idx rename to events_legacy_website_created_idx;

------------------------------------------------------------------------------
-- Helpers
------------------------------------------------------------------------------

-- Short public site id (URL-safe, lowercase alphanumeric).
create or replace function public.ws_public_id(p_len int default 8)
returns text
language sql volatile
as $$
    select string_agg(
        substr('abcdefghijkmnpqrstuvwxyz23456789', (floor(random() * 32))::int + 1, 1), ''
    )
    from generate_series(1, p_len);
$$;

------------------------------------------------------------------------------
-- Sites registry
------------------------------------------------------------------------------

create table public.sites (
    id uuid primary key default gen_random_uuid(),
    org_id uuid,
    public_id text not null unique default public.ws_public_id(),
    name text not null,
    domains text[] not null default '{}',
    privacy_mode text not null default 'stateless'
        check (privacy_mode in ('stateless', 'persistent')),
    settings jsonb not null default '{}'::jsonb,
    timezone text not null default 'UTC',
    user_id uuid,
    created_at timestamptz not null default now()
);

create index sites_domains_gin on public.sites using gin (domains);
create index sites_user_idx on public.sites (user_id);

-- Promote every legacy domain to a site (idempotent on domain match).
insert into public.sites (name, domains, user_id, created_at)
select d.domain, array[d.domain], d.user_id, d.created_at
from public.domains d
where not exists (
    select 1 from public.sites s where s.domains @> array[d.domain]
);

------------------------------------------------------------------------------
-- Daily salts (stateless visitor identity)
------------------------------------------------------------------------------

create table public.salts (
    day date primary key,
    salt bytea not null
);

-- Returns today's salt as hex, creating it on first use. The API route caches
-- the value in memory for 5 minutes.
create or replace function public.current_salt()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_salt bytea;
begin
    select salt into v_salt from salts where day = current_date;
    if v_salt is null then
        insert into salts (day, salt)
        values (current_date, gen_random_bytes(32))
        on conflict (day) do nothing;
        select salt into v_salt from salts where day = current_date;
    end if;
    return encode(v_salt, 'hex');
end;
$$;

------------------------------------------------------------------------------
-- Wide events table, partitioned by month
------------------------------------------------------------------------------

create table public.events (
    id bigint generated always as identity,
    site_id uuid not null,
    name text not null,
    visitor_id text not null,
    session_id uuid,
    path text not null default '/',
    url_query jsonb,
    title text,
    referrer text,
    referrer_domain text,
    channel text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_term text,
    utm_content text,
    device_type text,
    browser text,
    browser_version text,
    os text,
    os_version text,
    country char(2),
    region text,
    city text,
    lang text,
    screen_w int,
    screen_h int,
    user_id text,
    props jsonb,
    created_at timestamptz not null default now(),
    primary key (id, created_at)
) partition by range (created_at);

create index events_site_time_idx on public.events (site_id, created_at);
create index events_site_name_time_idx on public.events (site_id, name, created_at);
create index events_created_brin on public.events using brin (created_at);
create index events_props_gin on public.events using gin (props);

-- Creates the monthly partition covering p_month if missing.
create or replace function public.ensure_events_partition(p_month date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    start_d date := date_trunc('month', p_month)::date;
    end_d date := (date_trunc('month', p_month) + interval '1 month')::date;
    part_name text := 'events_' || to_char(start_d, 'YYYYMM');
begin
    if not exists (
        select 1
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where c.relname = part_name and n.nspname = 'public'
    ) then
        execute format(
            'create table public.%I partition of public.events for values from (%L) to (%L)',
            part_name, start_d, end_d
        );
    end if;
end;
$$;

select public.ensure_events_partition(current_date);
select public.ensure_events_partition((current_date + interval '1 month')::date);

------------------------------------------------------------------------------
-- Sessions (server-side sessionization, 30-minute inactivity window)
------------------------------------------------------------------------------

create table public.sessions (
    id uuid primary key default gen_random_uuid(),
    site_id uuid not null,
    visitor_id text not null,
    started_at timestamptz not null default now(),
    last_event_at timestamptz not null default now(),
    entry_path text,
    exit_path text,
    pageviews int not null default 0,
    events int not null default 0,
    referrer text,
    referrer_domain text,
    channel text,
    country char(2),
    region text,
    city text,
    device_type text,
    browser text,
    os text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    user_id text,
    is_open boolean not null default true,
    duration_s int generated always as
        (greatest(0, extract(epoch from (last_event_at - started_at))::int)) stored,
    is_bounce boolean generated always as (pageviews <= 1) stored
);

-- One open session per visitor per site; concurrent first events race on this
-- and retry (see ingest_event).
create unique index sessions_open_uniq on public.sessions (site_id, visitor_id) where is_open;
create index sessions_site_started_idx on public.sessions (site_id, started_at);
create index sessions_open_stale_idx on public.sessions (last_event_at) where is_open;

-- Closes sessions idle > 30 minutes (pg_cron, every 15 minutes).
create or replace function public.close_stale_sessions()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
    n int;
begin
    update sessions
    set is_open = false
    where is_open and last_event_at < now() - interval '30 minutes';
    get diagnostics n = row_count;
    return n;
end;
$$;

------------------------------------------------------------------------------
-- Daily rollups (summable metrics only; unique visitors are computed from
-- events at query time - uniques are not summable, see plan 02)
------------------------------------------------------------------------------

create table public.rollup_daily (
    site_id uuid not null,
    date date not null,
    pageviews bigint not null default 0,
    events bigint not null default 0,
    sessions bigint not null default 0,
    bounces bigint not null default 0,
    duration_s_sum bigint not null default 0,
    primary key (site_id, date)
);

------------------------------------------------------------------------------
-- ingest_event: insert events + sessionize + roll up, atomically per batch
------------------------------------------------------------------------------

create or replace function public.ingest_event(p_events jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
    e jsonb;
    v_site uuid;
    v_visitor text;
    v_name text;
    v_path text;
    v_now timestamptz;
    v_is_pageview boolean;
    v_sessionize boolean;
    v_session uuid;
    v_prev_pageviews int;
    v_prev_last timestamptz;
    v_started timestamptz;
    v_inserted int := 0;
begin
    if p_events is null or jsonb_typeof(p_events) <> 'array' then
        raise exception 'ingest_event expects a jsonb array';
    end if;

    for e in select * from jsonb_array_elements(p_events) loop
        v_site := (e ->> 'site_id')::uuid;
        v_visitor := e ->> 'visitor_id';
        v_name := e ->> 'name';
        v_path := coalesce(e ->> 'path', '/');
        v_now := coalesce((e ->> 'created_at')::timestamptz, now());
        v_is_pageview := v_name = 'pageview';
        -- Server-emitted events (API key sources) carry sessionize=false:
        -- they are stored and counted but never open or touch a session.
        v_sessionize := coalesce((e ->> 'sessionize')::boolean, true);

        if v_site is null or v_visitor is null or v_name is null then
            raise exception 'event missing site_id/visitor_id/name: %', e;
        end if;

        -- Best-effort beacon-replay dedupe: identical pageview for the same
        -- visitor+path within 5 seconds is dropped. Custom events are never
        -- deduped (rapid repeats can be legitimate).
        if v_is_pageview and exists (
            select 1 from events ev
            where ev.site_id = v_site
              and ev.visitor_id = v_visitor
              and ev.name = 'pageview'
              and ev.path = v_path
              and ev.created_at > v_now - interval '5 seconds'
              and ev.created_at <= v_now
        ) then
            continue;
        end if;

        -- ------------------------------------------------------- session --
        v_session := null;

        if v_sessionize then
        select s.id, s.pageviews, s.last_event_at, s.started_at
        into v_session, v_prev_pageviews, v_prev_last, v_started
        from sessions s
        where s.site_id = v_site and s.visitor_id = v_visitor and s.is_open
        for update;

        -- Expired but not yet closed by cron: close it, start fresh.
        if v_session is not null and v_prev_last < v_now - interval '30 minutes' then
            update sessions set is_open = false where id = v_session;
            v_session := null;
        end if;

        if v_session is null then
            begin
                insert into sessions (
                    site_id, visitor_id, started_at, last_event_at,
                    entry_path, exit_path, pageviews, events,
                    referrer, referrer_domain, channel,
                    country, region, city,
                    device_type, browser, os,
                    utm_source, utm_medium, utm_campaign, user_id
                ) values (
                    v_site, v_visitor, v_now, v_now,
                    case when v_is_pageview then v_path end,
                    case when v_is_pageview then v_path end,
                    case when v_is_pageview then 1 else 0 end,
                    1,
                    e ->> 'referrer', e ->> 'referrer_domain', e ->> 'channel',
                    nullif(e ->> 'country', ''), e ->> 'region', e ->> 'city',
                    e ->> 'device_type', e ->> 'browser', e ->> 'os',
                    e ->> 'utm_source', e ->> 'utm_medium', e ->> 'utm_campaign',
                    e ->> 'user_id'
                )
                returning id, started_at into v_session, v_started;

                -- New session: sessions +1; every fresh session starts as a
                -- bounce (pageviews <= 1).
                insert into rollup_daily as r (site_id, date, sessions, bounces)
                values (v_site, (v_now at time zone 'UTC')::date, 1, 1)
                on conflict (site_id, date) do update
                set sessions = r.sessions + 1,
                    bounces = r.bounces + 1;
            exception when unique_violation then
                -- Concurrent first event won the race; reuse its session.
                select s.id, s.pageviews, s.last_event_at, s.started_at
                into v_session, v_prev_pageviews, v_prev_last, v_started
                from sessions s
                where s.site_id = v_site and s.visitor_id = v_visitor and s.is_open
                for update;

                if v_session is null then
                    raise exception 'session race lost and no open session found for %/%', v_site, v_visitor;
                end if;

                perform ingest_touch_session(
                    v_session, v_site, v_started, v_prev_last, v_prev_pageviews,
                    v_now, v_is_pageview, v_path,
                    e ->> 'user_id'
                );
            end;
        else
            perform ingest_touch_session(
                v_session, v_site, v_started, v_prev_last, v_prev_pageviews,
                v_now, v_is_pageview, v_path,
                e ->> 'user_id'
            );
        end if;
        end if; -- v_sessionize

        -- --------------------------------------------------------- event --
        insert into events (
            site_id, name, visitor_id, session_id,
            path, url_query, title,
            referrer, referrer_domain, channel,
            utm_source, utm_medium, utm_campaign, utm_term, utm_content,
            device_type, browser, browser_version, os, os_version,
            country, region, city, lang, screen_w, screen_h,
            user_id, props, created_at
        ) values (
            v_site, v_name, v_visitor, v_session,
            v_path, e -> 'url_query', e ->> 'title',
            e ->> 'referrer', e ->> 'referrer_domain', e ->> 'channel',
            e ->> 'utm_source', e ->> 'utm_medium', e ->> 'utm_campaign',
            e ->> 'utm_term', e ->> 'utm_content',
            e ->> 'device_type', e ->> 'browser', e ->> 'browser_version',
            e ->> 'os', e ->> 'os_version',
            nullif(e ->> 'country', ''), e ->> 'region', e ->> 'city',
            e ->> 'lang', (e ->> 'screen_w')::int, (e ->> 'screen_h')::int,
            e ->> 'user_id', e -> 'props', v_now
        );

        -- Event-level rollup counters (keyed by the event's UTC date).
        insert into rollup_daily as r (site_id, date, pageviews, events)
        values (
            v_site, (v_now at time zone 'UTC')::date,
            case when v_is_pageview then 1 else 0 end, 1
        )
        on conflict (site_id, date) do update
        set pageviews = r.pageviews + excluded.pageviews,
            events = r.events + excluded.events;

        v_inserted := v_inserted + 1;
    end loop;

    return v_inserted;
end;
$$;

-- Updates an existing open session for one incoming event and maintains the
-- session-derived rollup columns (bounces, duration_s_sum) on the date the
-- session STARTED (a session belongs to one rollup row even across midnight).
create or replace function public.ingest_touch_session(
    p_session uuid,
    p_site uuid,
    p_started timestamptz,
    p_prev_last timestamptz,
    p_prev_pageviews int,
    p_now timestamptz,
    p_is_pageview boolean,
    p_path text,
    p_user_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_delta int := greatest(0, extract(epoch from (p_now - p_prev_last))::int);
begin
    update sessions
    set last_event_at = greatest(last_event_at, p_now),
        exit_path = case when p_is_pageview then p_path else exit_path end,
        entry_path = case
            when p_is_pageview and entry_path is null then p_path
            else entry_path
        end,
        pageviews = pageviews + case when p_is_pageview then 1 else 0 end,
        events = events + 1,
        user_id = coalesce(p_user_id, user_id)
    where id = p_session;

    insert into rollup_daily as r (site_id, date, bounces, duration_s_sum)
    values (
        p_site, (p_started at time zone 'UTC')::date,
        -- The session stops being a bounce on its second pageview.
        case when p_is_pageview and p_prev_pageviews = 1 then -1 else 0 end,
        v_delta
    )
    on conflict (site_id, date) do update
    set bounces = r.bounces + excluded.bounces,
        duration_s_sum = r.duration_s_sum + excluded.duration_s_sum;
end;
$$;

------------------------------------------------------------------------------
-- Rollup rebuild (used by the backfill script and parity checks)
------------------------------------------------------------------------------

create or replace function public.rebuild_rollup_daily(p_site uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    delete from rollup_daily where site_id = p_site;

    insert into rollup_daily (site_id, date, pageviews, events, sessions, bounces, duration_s_sum)
    select
        coalesce(ev.site_id, se.site_id),
        coalesce(ev.date, se.date),
        coalesce(ev.pageviews, 0),
        coalesce(ev.events, 0),
        coalesce(se.sessions, 0),
        coalesce(se.bounces, 0),
        coalesce(se.duration_s_sum, 0)
    from (
        select site_id, (created_at at time zone 'UTC')::date as date,
               count(*) filter (where name = 'pageview') as pageviews,
               count(*) as events
        from events
        where site_id = p_site
        group by 1, 2
    ) ev
    full outer join (
        select site_id, (started_at at time zone 'UTC')::date as date,
               count(*) as sessions,
               count(*) filter (where is_bounce) as bounces,
               sum(duration_s) as duration_s_sum
        from sessions
        where site_id = p_site
        group by 1, 2
    ) se on se.site_id = ev.site_id and se.date = ev.date;
end;
$$;

------------------------------------------------------------------------------
-- Read RPCs - consumed only by lib/analytics/queries.ts
------------------------------------------------------------------------------

create or replace function public.analytics_overview(
    p_site uuid,
    p_from timestamptz,
    p_to timestamptz
) returns table (
    pageviews bigint,
    visitors bigint,
    sessions bigint,
    bounce_rate numeric,
    avg_duration_s numeric
)
language sql stable
security definer
set search_path = public
as $$
    with ev as (
        select count(*) filter (where name = 'pageview') as pageviews,
               -- Only sessionized (browser) traffic counts as visitors;
               -- server-emitted API events have session_id null.
               count(distinct visitor_id) filter (where session_id is not null) as visitors
        from events
        where site_id = p_site and created_at >= p_from and created_at < p_to
    ),
    se as (
        select count(*) as sessions,
               count(*) filter (where is_bounce) as bounces,
               avg(duration_s) as avg_duration_s
        from sessions
        where site_id = p_site and started_at >= p_from and started_at < p_to
    )
    select ev.pageviews,
           ev.visitors,
           se.sessions,
           case when se.sessions > 0
                then round(se.bounces::numeric / se.sessions, 4) else 0 end,
           coalesce(round(se.avg_duration_s, 1), 0)
    from ev, se;
$$;

create or replace function public.analytics_timeseries(
    p_site uuid,
    p_from timestamptz,
    p_to timestamptz,
    p_granularity text default 'day'
) returns table (
    bucket timestamptz,
    pageviews bigint,
    visitors bigint,
    sessions bigint
)
language plpgsql stable
security definer
set search_path = public
as $$
begin
    if p_granularity not in ('hour', 'day', 'week', 'month') then
        raise exception 'invalid granularity %', p_granularity;
    end if;

    return query
    select gs.bucket,
           coalesce(ev.pageviews, 0)::bigint,
           coalesce(ev.visitors, 0)::bigint,
           coalesce(se.sessions, 0)::bigint
    from generate_series(
        date_trunc(p_granularity, p_from),
        date_trunc(p_granularity, p_to),
        ('1 ' || p_granularity)::interval
    ) as gs(bucket)
    left join (
        select date_trunc(p_granularity, created_at) as bucket,
               count(*) filter (where name = 'pageview') as pageviews,
               count(distinct visitor_id) filter (where session_id is not null) as visitors
        from events
        where site_id = p_site and created_at >= p_from and created_at < p_to
        group by 1
    ) ev on ev.bucket = gs.bucket
    left join (
        select date_trunc(p_granularity, started_at) as bucket,
               count(*) as sessions
        from sessions
        where site_id = p_site and started_at >= p_from and started_at < p_to
        group by 1
    ) se on se.bucket = gs.bucket
    order by gs.bucket;
end;
$$;

create or replace function public.analytics_breakdown(
    p_site uuid,
    p_from timestamptz,
    p_to timestamptz,
    p_dimension text,
    p_limit int default 10
) returns table (
    value text,
    pageviews bigint,
    visitors bigint
)
language plpgsql stable
security definer
set search_path = public
as $$
begin
    if p_dimension not in (
        'path', 'referrer_domain', 'channel', 'country', 'region', 'city',
        'device_type', 'browser', 'os', 'lang',
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'
    ) then
        raise exception 'invalid breakdown dimension %', p_dimension;
    end if;

    return query execute format(
        $q$
        select %1$I::text as value,
               count(*) filter (where name = 'pageview') as pageviews,
               count(distinct visitor_id) filter (where session_id is not null) as visitors
        from public.events
        where site_id = $1 and created_at >= $2 and created_at < $3
          and %1$I is not null
        group by 1
        order by visitors desc, pageviews desc
        limit $4
        $q$, p_dimension
    ) using p_site, p_from, p_to, p_limit;
end;
$$;

------------------------------------------------------------------------------
-- Security: RLS on, access only through the service role / definer RPCs
------------------------------------------------------------------------------

-- The service role is the only direct reader/writer of the new tables
-- (ingestion route, queries.ts, backfill). Everything else goes through the
-- SECURITY DEFINER RPCs above. anon/authenticated get no table grants.
grant select, insert, update, delete
    on public.sites, public.salts, public.events, public.sessions, public.rollup_daily
    to service_role;
grant usage, select on all sequences in schema public to service_role;
grant select on public.sites to authenticated;

alter table public.sites enable row level security;
alter table public.salts enable row level security;
alter table public.events enable row level security;
alter table public.sessions enable row level security;
alter table public.rollup_daily enable row level security;

-- Site owners may read their own sites (dashboard site pickers).
create policy sites_owner_select on public.sites
    for select to authenticated
    using (user_id = (select auth.uid()));

revoke all on function public.current_salt() from public, anon, authenticated;
revoke all on function public.ingest_event(jsonb) from public, anon, authenticated;
revoke all on function public.ingest_touch_session(uuid, uuid, timestamptz, timestamptz, int, timestamptz, boolean, text, text) from public, anon, authenticated;
revoke all on function public.ensure_events_partition(date) from public, anon, authenticated;
revoke all on function public.close_stale_sessions() from public, anon, authenticated;
revoke all on function public.rebuild_rollup_daily(uuid) from public, anon, authenticated;
revoke all on function public.analytics_overview(uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.analytics_timeseries(uuid, timestamptz, timestamptz, text) from public, anon, authenticated;
revoke all on function public.analytics_breakdown(uuid, timestamptz, timestamptz, text, int) from public, anon, authenticated;

grant execute on function
    public.current_salt(),
    public.ingest_event(jsonb),
    public.ensure_events_partition(date),
    public.close_stale_sessions(),
    public.rebuild_rollup_daily(uuid),
    public.analytics_overview(uuid, timestamptz, timestamptz),
    public.analytics_timeseries(uuid, timestamptz, timestamptz, text),
    public.analytics_breakdown(uuid, timestamptz, timestamptz, text, int)
    to service_role;

------------------------------------------------------------------------------
-- Scheduled maintenance (requires pg_cron)
------------------------------------------------------------------------------

do $$ begin
    if exists (select 1 from pg_extension where extname = 'pg_cron') then
        -- Rotate salts: drop everything before today at 00:05 UTC. Today's
        -- salt is created lazily by current_salt().
        perform cron.schedule(
            'ws-rotate-salts', '5 0 * * *',
            $j$delete from public.salts where day < current_date$j$
        );
        -- Keep next month's events partition ready (daily, idempotent).
        perform cron.schedule(
            'ws-ensure-partition', '10 0 * * *',
            $j$select public.ensure_events_partition((current_date + interval '1 month')::date)$j$
        );
        -- Close idle sessions every 15 minutes.
        perform cron.schedule(
            'ws-close-sessions', '*/15 * * * *',
            $j$select public.close_stale_sessions()$j$
        );
    else
        raise notice 'pg_cron not installed - skipping job scheduling';
    end if;
end $$;
