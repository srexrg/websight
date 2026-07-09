-- Plans 04+05: filter-aware analytics reads + dimension type-ahead + segments.
--
-- Canonical filter model (docs/redesign/05):
--   [{"dim":"country","op":"is","values":["US","DE"]}, ...]
-- Ops: is | is_not | contains | not_contains. Dims are whitelisted below;
-- "prop:<key>" targets props->>key; entry_path/exit_path are session-scoped.
-- Values are escaped with quote_literal - never interpolated raw.

------------------------------------------------------------------------------
-- WHERE-clause builder (conditions are relative to events alias "e")
------------------------------------------------------------------------------
create or replace function public._analytics_where(p_filters jsonb)
returns text
language plpgsql immutable
as $$
declare
    f jsonb;
    dim text;
    op text;
    vals text[];
    conds text[] := '{}';
    col text;
    session_col text;
    cond text;
    quoted text;
    likes text;
    v text;
begin
    if p_filters is null or jsonb_typeof(p_filters) <> 'array' then
        return 'true';
    end if;

    for f in select * from jsonb_array_elements(p_filters) loop
        dim := f->>'dim';
        op := f->>'op';
        if op not in ('is', 'is_not', 'contains', 'not_contains') then
            raise exception 'invalid filter operator %', op;
        end if;
        select array_agg(x.v) into vals
        from jsonb_array_elements_text(f->'values') as x(v)
        where x.v is not null and x.v <> '';
        if vals is null then continue; end if;
        if array_length(vals, 1) > 20 then
            raise exception 'too many filter values (max 20)';
        end if;

        session_col := null;
        if dim in ('path', 'channel', 'referrer_domain', 'country', 'region',
                   'city', 'device_type', 'browser', 'os', 'lang', 'name',
                   'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content') then
            col := format('e.%I', dim);
        elsif dim in ('entry_path', 'exit_path') then
            session_col := format('s2.%I', dim);
        elsif dim like 'prop:%' and length(dim) between 6 and 70 then
            col := format('(e.props ->> %L)', substring(dim from 6));
        else
            raise exception 'invalid filter dimension %', dim;
        end if;
        if session_col is not null then
            col := session_col;
        end if;

        if op in ('is', 'is_not') then
            select string_agg(quote_literal(x), ', ') into quoted from unnest(vals) x;
            if op = 'is' then
                cond := format('%s in (%s)', col, quoted);
            else
                cond := format('(%s is null or %s not in (%s))', col, col, quoted);
            end if;
        else
            select string_agg(
                       format('%s ilike %L', col,
                              '%' || replace(replace(replace(x, '\', '\\'), '%', '\%'), '_', '\_') || '%'),
                       ' or ')
              into likes
              from unnest(vals) x;
            if op = 'contains' then
                cond := format('(%s)', likes);
            else
                cond := format('(%s is null or not (%s))', col, likes);
            end if;
        end if;

        if session_col is not null then
            cond := format(
                'e.session_id in (select s2.id from public.sessions s2 where s2.site_id = e.site_id and %s)',
                cond);
        end if;
        conds := conds || cond;
    end loop;

    if array_length(conds, 1) is null then
        return 'true';
    end if;
    return array_to_string(conds, ' and ');
end;
$$;

------------------------------------------------------------------------------
-- analytics_overview (drop old 3-arg signature, recreate with p_filters)
------------------------------------------------------------------------------
drop function if exists public.analytics_overview(uuid, timestamptz, timestamptz);

create or replace function public.analytics_overview(
    p_site uuid,
    p_from timestamptz,
    p_to timestamptz,
    p_filters jsonb default '[]'::jsonb
) returns table (
    pageviews bigint,
    visitors bigint,
    sessions bigint,
    bounce_rate numeric,
    avg_duration_s numeric
)
language plpgsql stable
security definer
set search_path = public
as $$
declare
    w text := public._analytics_where(p_filters);
begin
    if w = 'true' then
        return query
        with ev as (
            select count(*) filter (where e.name = 'pageview') as pageviews,
                   count(distinct e.visitor_id) filter (where e.session_id is not null) as visitors
            from events e
            where e.site_id = p_site and e.created_at >= p_from and e.created_at < p_to
        ),
        se as (
            select count(*) as sessions,
                   count(*) filter (where s.is_bounce) as bounces,
                   avg(s.duration_s) as avg_duration_s
            from sessions s
            where s.site_id = p_site and s.started_at >= p_from and s.started_at < p_to
        )
        select ev.pageviews, ev.visitors, se.sessions,
               case when se.sessions > 0 then round(se.bounces::numeric / se.sessions, 4) else 0 end,
               coalesce(round(se.avg_duration_s, 1), 0)
        from ev, se;
    else
        return query execute format($q$
            with ev as (
                select e.name, e.visitor_id, e.session_id
                from public.events e
                where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3 and %s
            ),
            se as (
                select count(*) as sessions,
                       count(*) filter (where s.is_bounce) as bounces,
                       avg(s.duration_s) as avg_duration_s
                from public.sessions s
                where s.id in (select distinct ev.session_id from ev where ev.session_id is not null)
            )
            select (select count(*) from ev where ev.name = 'pageview'),
                   (select count(distinct ev.visitor_id) from ev where ev.session_id is not null),
                   se.sessions,
                   case when se.sessions > 0 then round(se.bounces::numeric / se.sessions, 4) else 0 end,
                   coalesce(round(se.avg_duration_s, 1), 0)
            from se
        $q$, w) using p_site, p_from, p_to;
    end if;
end;
$$;

------------------------------------------------------------------------------
-- analytics_timeseries (filtered sessions counted by event presence in bucket)
------------------------------------------------------------------------------
drop function if exists public.analytics_timeseries(uuid, timestamptz, timestamptz, text);

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
    if p_granularity not in ('hour', 'day', 'week', 'month') then
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

------------------------------------------------------------------------------
-- analytics_breakdown (+ entry_path/exit_path session dims, + filters)
------------------------------------------------------------------------------
drop function if exists public.analytics_breakdown(uuid, timestamptz, timestamptz, text, int);

create or replace function public.analytics_breakdown(
    p_site uuid,
    p_from timestamptz,
    p_to timestamptz,
    p_dimension text,
    p_limit int default 10,
    p_filters jsonb default '[]'::jsonb
) returns table (
    value text,
    pageviews bigint,
    visitors bigint
)
language plpgsql stable
security definer
set search_path = public
as $$
declare
    w text := public._analytics_where(p_filters);
begin
    if p_dimension in ('entry_path', 'exit_path') then
        return query execute format($q$
            select s.%I::text as value,
                   sum(s.pageviews)::bigint as pageviews,
                   count(distinct s.visitor_id) as visitors
            from public.sessions s
            where s.site_id = $1 and s.started_at >= $2 and s.started_at < $3
              and s.%I is not null
              and s.id in (
                  select e.session_id from public.events e
                  where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3
                    and e.session_id is not null and %s
              )
            group by 1
            order by visitors desc, pageviews desc
            limit $4
        $q$, p_dimension, p_dimension, w) using p_site, p_from, p_to, p_limit;
        return;
    end if;

    if p_dimension not in (
        'path', 'referrer_domain', 'channel', 'country', 'region', 'city',
        'device_type', 'browser', 'os', 'lang',
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'
    ) then
        raise exception 'invalid breakdown dimension %', p_dimension;
    end if;

    return query execute format($q$
        select e.%1$I::text as value,
               count(*) filter (where e.name = 'pageview') as pageviews,
               count(distinct e.visitor_id) filter (where e.session_id is not null) as visitors
        from public.events e
        where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3
          and e.%1$I is not null and %2$s
        group by 1
        order by visitors desc, pageviews desc
        limit $4
    $q$, p_dimension, w) using p_site, p_from, p_to, p_limit;
end;
$$;

------------------------------------------------------------------------------
-- analytics_event_breakdown (+ filters)
------------------------------------------------------------------------------
drop function if exists public.analytics_event_breakdown(uuid, timestamptz, timestamptz, int);

create or replace function public.analytics_event_breakdown(
    p_site uuid,
    p_from timestamptz,
    p_to timestamptz,
    p_limit int default 50,
    p_filters jsonb default '[]'::jsonb
) returns table (
    name text,
    count bigint,
    visitors bigint
)
language plpgsql stable
security definer
set search_path = public
as $$
declare
    w text := public._analytics_where(p_filters);
begin
    return query execute format($q$
        select e.name,
               count(*) as count,
               count(distinct e.visitor_id) filter (where e.session_id is not null) as visitors
        from public.events e
        where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3
          and e.name <> 'pageview' and %s
        group by e.name
        order by count desc
        limit $4
    $q$, w) using p_site, p_from, p_to, p_limit;
end;
$$;

------------------------------------------------------------------------------
-- Type-ahead values for the filter editor, ranked by traffic in range
------------------------------------------------------------------------------
create or replace function public.analytics_dimension_values(
    p_site uuid,
    p_from timestamptz,
    p_to timestamptz,
    p_dimension text,
    p_query text default '',
    p_limit int default 10
) returns table (
    value text,
    count bigint
)
language plpgsql stable
security definer
set search_path = public
as $$
declare
    q text := '%' || replace(replace(replace(coalesce(p_query, ''), '\', '\\'), '%', '\%'), '_', '\_') || '%';
begin
    if p_dimension in ('entry_path', 'exit_path') then
        return query execute format($q$
            select s.%1$I::text as value, count(*)::bigint as count
            from public.sessions s
            where s.site_id = $1 and s.started_at >= $2 and s.started_at < $3
              and s.%1$I is not null and s.%1$I ilike $4
            group by 1 order by 2 desc limit $5
        $q$, p_dimension) using p_site, p_from, p_to, q, p_limit;
        return;
    end if;

    if p_dimension not in (
        'path', 'referrer_domain', 'channel', 'country', 'region', 'city',
        'device_type', 'browser', 'os', 'lang', 'name',
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'
    ) then
        raise exception 'invalid dimension %', p_dimension;
    end if;

    return query execute format($q$
        select e.%1$I::text as value, count(*)::bigint as count
        from public.events e
        where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3
          and e.%1$I is not null and e.%1$I ilike $4
        group by 1 order by 2 desc limit $5
    $q$, p_dimension) using p_site, p_from, p_to, q, p_limit;
end;
$$;

------------------------------------------------------------------------------
-- Saved segments (docs/redesign/05; CRUD UI ships later)
------------------------------------------------------------------------------
create table if not exists public.segments (
    id uuid primary key default gen_random_uuid(),
    site_id uuid not null references public.sites (id) on delete cascade,
    owner_id uuid not null,
    name text not null,
    filters jsonb not null default '[]'::jsonb,
    visibility text not null default 'personal' check (visibility in ('personal', 'site')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create index if not exists segments_site_idx on public.segments (site_id);
alter table public.segments enable row level security;
grant select, insert, update, delete on public.segments to service_role;

------------------------------------------------------------------------------
-- Grants for the (re)created functions
------------------------------------------------------------------------------
revoke all on function public._analytics_where(jsonb) from public, anon, authenticated;
revoke all on function public.analytics_overview(uuid, timestamptz, timestamptz, jsonb) from public, anon, authenticated;
revoke all on function public.analytics_timeseries(uuid, timestamptz, timestamptz, text, jsonb) from public, anon, authenticated;
revoke all on function public.analytics_breakdown(uuid, timestamptz, timestamptz, text, int, jsonb) from public, anon, authenticated;
revoke all on function public.analytics_event_breakdown(uuid, timestamptz, timestamptz, int, jsonb) from public, anon, authenticated;
revoke all on function public.analytics_dimension_values(uuid, timestamptz, timestamptz, text, text, int) from public, anon, authenticated;
grant execute on function public.analytics_overview(uuid, timestamptz, timestamptz, jsonb) to service_role;
grant execute on function public.analytics_timeseries(uuid, timestamptz, timestamptz, text, jsonb) to service_role;
grant execute on function public.analytics_breakdown(uuid, timestamptz, timestamptz, text, int, jsonb) to service_role;
grant execute on function public.analytics_event_breakdown(uuid, timestamptz, timestamptz, int, jsonb) to service_role;
grant execute on function public.analytics_dimension_values(uuid, timestamptz, timestamptz, text, text, int) to service_role;
