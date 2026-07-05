-- Plan 06: realtime reads. Live = events in the last N minutes (default 5,
-- the industry-consistent definition). All functions respect the plan-05
-- filter model via _analytics_where.

-- Minute granularity for the realtime per-minute chart.
create or replace function public.analytics_timeseries(
    p_site uuid,
    p_from timestamptz,
    p_to timestamptz,
    p_granularity text default 'day',
    p_filters jsonb default '[]'::jsonb
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
declare
    w text := public._analytics_where(p_filters);
begin
    if p_granularity not in ('minute', 'hour', 'day', 'week', 'month') then
        raise exception 'invalid granularity %', p_granularity;
    end if;

    return query execute format($q$
        select gs.bucket,
               coalesce(ev.pageviews, 0)::bigint,
               coalesce(ev.visitors, 0)::bigint,
               coalesce(ev.sessions, 0)::bigint
        from generate_series(
            date_trunc($4, $2), date_trunc($4, $3), ('1 ' || $4)::interval
        ) as gs(bucket)
        left join (
            select date_trunc($4, e.created_at) as bucket,
                   count(*) filter (where e.name = 'pageview') as pageviews,
                   count(distinct e.visitor_id) filter (where e.session_id is not null) as visitors,
                   count(distinct e.session_id) as sessions
            from public.events e
            where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3 and %s
            group by 1
        ) ev on ev.bucket = gs.bucket
        order by gs.bucket
    $q$, w) using p_site, p_from, p_to, p_granularity;
end;
$$;

-- Live visitor count (distinct sessionized visitors, last N minutes).
create or replace function public.analytics_live_count(
    p_site uuid,
    p_minutes int default 5,
    p_filters jsonb default '[]'::jsonb
) returns bigint
language plpgsql stable
security definer
set search_path = public
as $$
declare
    w text := public._analytics_where(p_filters);
    result bigint;
begin
    execute format($q$
        select count(distinct e.visitor_id)
        from public.events e
        where e.site_id = $1
          and e.created_at > now() - make_interval(mins => $2)
          and e.session_id is not null and %s
    $q$, w) into result using p_site, least(greatest(p_minutes, 1), 60);
    return coalesce(result, 0);
end;
$$;

-- Live breakdown (active pages / referrers / countries / devices ...).
create or replace function public.analytics_live_breakdown(
    p_site uuid,
    p_dimension text,
    p_minutes int default 5,
    p_limit int default 10,
    p_filters jsonb default '[]'::jsonb
) returns table (
    value text,
    visitors bigint
)
language plpgsql stable
security definer
set search_path = public
as $$
declare
    w text := public._analytics_where(p_filters);
begin
    if p_dimension not in (
        'path', 'referrer_domain', 'channel', 'country', 'region', 'city',
        'device_type', 'browser', 'os', 'name'
    ) then
        raise exception 'invalid live dimension %', p_dimension;
    end if;

    return query execute format($q$
        select e.%1$I::text as value,
               count(distinct e.visitor_id) as visitors
        from public.events e
        where e.site_id = $1
          and e.created_at > now() - make_interval(mins => $2)
          and e.session_id is not null
          and e.%1$I is not null and %2$s
        group by 1
        order by visitors desc
        limit $3
    $q$, p_dimension, w) using p_site, least(greatest(p_minutes, 1), 60), p_limit;
end;
$$;

-- Fast "recently active" session lookups (live counts, plan 07 later).
create index if not exists sessions_site_last_event_idx
    on public.sessions (site_id, last_event_at desc);

revoke all on function public.analytics_live_count(uuid, int, jsonb) from public, anon, authenticated;
revoke all on function public.analytics_live_breakdown(uuid, text, int, int, jsonb) from public, anon, authenticated;
grant execute on function public.analytics_live_count(uuid, int, jsonb) to service_role;
grant execute on function public.analytics_live_breakdown(uuid, text, int, int, jsonb) to service_role;
