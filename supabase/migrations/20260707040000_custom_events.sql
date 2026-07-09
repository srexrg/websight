-- Plan 14: Custom Events v2.
-- Custom events are all events whose name is not a reserved/system name. These
-- RPCs aggregate them into a names table, per-event timeseries, a property
-- explorer (sampled prop keys + value breakdowns), and an occurrences feed. An
-- event_dictionary row is auto-upserted at ingest for governance (description,
-- expected props, first/last seen).

-- Reserved names never appear as "custom events".
create or replace function public._is_reserved_event(p_name text)
returns boolean language sql immutable as $$
    select p_name in ('pageview', 'web_vital', 'error', 'identify');
$$;

create table if not exists public.event_dictionary (
    site_id uuid not null references public.sites(id) on delete cascade,
    name text not null,
    description text,
    expected_props jsonb not null default '[]'::jsonb,
    first_seen timestamptz not null default now(),
    last_seen timestamptz not null default now(),
    primary key (site_id, name)
);
alter table public.event_dictionary enable row level security;

-- Auto-populate the dictionary from custom events (exception-safe).
create or replace function public.event_dictionary_upsert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    if new.name is null or public._is_reserved_event(new.name) then
        return new;
    end if;
    begin
        insert into public.event_dictionary as d (site_id, name, first_seen, last_seen)
        values (new.site_id, new.name, new.created_at, new.created_at)
        on conflict (site_id, name) do update set
            first_seen = least(d.first_seen, excluded.first_seen),
            last_seen = greatest(d.last_seen, excluded.last_seen);
    exception when others then
        null; -- dictionary upkeep must never break ingestion
    end;
    return new;
end $$;

drop trigger if exists events_dictionary_upsert on public.events;
create trigger events_dictionary_upsert
    after insert on public.events
    for each row execute function public.event_dictionary_upsert();

-- ------------------------------------------------------------------ read RPCs

-- Aggregated custom-event names with dictionary metadata.
create or replace function public.analytics_event_names(
    p_site uuid, p_from timestamptz, p_to timestamptz,
    p_filters jsonb default '[]'::jsonb, p_limit int default 100
) returns table (
    name text, count bigint, visitors bigint, last_seen timestamptz,
    description text, expected_props jsonb, dict_last_seen timestamptz
)
language plpgsql stable security definer set search_path = public
as $$
declare
    w text := public._analytics_where(p_filters);
    v_limit int := least(greatest(coalesce(p_limit, 100), 1), 500);
begin
    return query execute format($q$
        with agg as (
            select e.name,
                   count(*)::bigint as count,
                   count(distinct e.visitor_id)::bigint as visitors,
                   max(e.created_at) as last_seen
            from public.events e
            where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3
              and not public._is_reserved_event(e.name) and (%s)
            group by e.name
        )
        select a.name, a.count, a.visitors, a.last_seen,
               d.description, coalesce(d.expected_props, '[]'::jsonb), d.last_seen
        from agg a
        left join public.event_dictionary d on d.site_id = $1 and d.name = a.name
        order by a.count desc
        limit %s
    $q$, w, v_limit) using p_site, p_from, p_to;
end $$;

-- Per-event occurrence timeseries.
create or replace function public.analytics_event_timeseries(
    p_site uuid, p_name text, p_from timestamptz, p_to timestamptz,
    p_granularity text default 'day', p_filters jsonb default '[]'::jsonb
) returns table (bucket timestamptz, count bigint, visitors bigint)
language plpgsql stable security definer set search_path = public
as $$
declare
    w text := public._analytics_where(p_filters);
    g text := case when p_granularity in ('hour','day','week','month') then p_granularity else 'day' end;
begin
    return query execute format($q$
        select date_trunc(%L, e.created_at), count(*)::bigint, count(distinct e.visitor_id)::bigint
        from public.events e
        where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3
          and e.name = $4 and (%s)
        group by 1 order by 1
    $q$, g, w) using p_site, p_from, p_to, p_name;
end $$;

-- Property keys seen for an event (sampled over recent rows, capped).
create or replace function public.analytics_event_prop_keys(
    p_site uuid, p_name text, p_from timestamptz, p_to timestamptz, p_sample int default 50000
) returns table (key text, count bigint)
language plpgsql stable security definer set search_path = public
as $$
declare v_sample int := least(greatest(coalesce(p_sample, 50000), 1), 200000);
begin
    return query execute format($q$
        with sample as (
            select e.props from public.events e
            where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3
              and e.name = $4 and jsonb_typeof(e.props) = 'object'
            order by e.created_at desc limit %s
        )
        select k.key, count(*)::bigint
        from sample s, lateral jsonb_object_keys(s.props) as k(key)
        where k.key <> 'fingerprint'
        group by k.key order by 2 desc limit 60
    $q$, v_sample) using p_site, p_name, p_from, p_to;
end $$;

-- Value breakdown for one event property, with a high-cardinality guard.
create or replace function public.analytics_event_prop_values(
    p_site uuid, p_name text, p_key text, p_from timestamptz, p_to timestamptz,
    p_filters jsonb default '[]'::jsonb, p_limit int default 50
) returns table (value text, count bigint, total_distinct bigint)
language plpgsql stable security definer set search_path = public
as $$
declare
    w text := public._analytics_where(p_filters);
    v_limit int := least(greatest(coalesce(p_limit, 50), 1), 200);
begin
    return query execute format($q$
        with vals as (
            select e.props->>$5 as v
            from public.events e
            where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3
              and e.name = $4 and e.props ? $5 and (%s)
        )
        select coalesce(v, '(null)') as value, count(*)::bigint,
               (select count(distinct v) from vals)::bigint as total_distinct
        from vals group by v order by 2 desc limit %s
    $q$, w, v_limit) using p_site, p_from, p_to, p_name, p_key;
end $$;

-- Recent occurrences of an event (raw feed inside detail).
create or replace function public.analytics_event_occurrences(
    p_site uuid, p_name text, p_from timestamptz, p_to timestamptz,
    p_filters jsonb default '[]'::jsonb, p_limit int default 25
) returns table (
    created_at timestamptz, session_id uuid, visitor_id text,
    path text, country text, props jsonb
)
language plpgsql stable security definer set search_path = public
as $$
declare
    w text := public._analytics_where(p_filters);
    v_limit int := least(greatest(coalesce(p_limit, 25), 1), 100);
begin
    return query execute format($q$
        select e.created_at, e.session_id, e.visitor_id, e.path, e.country::text, e.props
        from public.events e
        where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3
          and e.name = $4 and (%s)
        order by e.created_at desc limit %s
    $q$, w, v_limit) using p_site, p_from, p_to, p_name;
end $$;

revoke all on function public._is_reserved_event(text) from public, anon, authenticated;
revoke all on function public.analytics_event_names(uuid, timestamptz, timestamptz, jsonb, int) from public, anon, authenticated;
revoke all on function public.analytics_event_timeseries(uuid, text, timestamptz, timestamptz, text, jsonb) from public, anon, authenticated;
revoke all on function public.analytics_event_prop_keys(uuid, text, timestamptz, timestamptz, int) from public, anon, authenticated;
revoke all on function public.analytics_event_prop_values(uuid, text, text, timestamptz, timestamptz, jsonb, int) from public, anon, authenticated;
revoke all on function public.analytics_event_occurrences(uuid, text, timestamptz, timestamptz, jsonb, int) from public, anon, authenticated;
grant execute on function public.analytics_event_names(uuid, timestamptz, timestamptz, jsonb, int) to service_role;
grant execute on function public.analytics_event_timeseries(uuid, text, timestamptz, timestamptz, text, jsonb) to service_role;
grant execute on function public.analytics_event_prop_keys(uuid, text, timestamptz, timestamptz, int) to service_role;
grant execute on function public.analytics_event_prop_values(uuid, text, text, timestamptz, timestamptz, jsonb, int) to service_role;
grant execute on function public.analytics_event_occurrences(uuid, text, timestamptz, timestamptz, jsonb, int) to service_role;
