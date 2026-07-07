-- Plan 12 fix: percentile_cont(...) over a numeric column returns double
-- precision, which (a) fails the RETURNS TABLE numeric result-type check and
-- (b) fails to resolve against _vital_rating(text, numeric). Cast every
-- percentile to ::numeric: result columns then match their declared type and
-- the numeric _vital_rating overload resolves. Bodies are otherwise identical
-- to 20260707010000.

create or replace function public.analytics_vitals_summary(
    p_site uuid,
    p_from timestamptz,
    p_to timestamptz,
    p_filters jsonb default '[]'::jsonb
) returns table (metric text, sample bigint, p75 numeric, good bigint, ni bigint, poor bigint, rating text)
language plpgsql stable security definer set search_path = public
as $$
declare w text := public._analytics_where(p_filters);
begin
    return query execute format($q$
        select s.m,
               count(*)::bigint,
               (percentile_cont(0.75) within group (order by s.vv))::numeric,
               count(*) filter (where public._vital_rating(s.m, s.vv) = 'good')::bigint,
               count(*) filter (where public._vital_rating(s.m, s.vv) = 'ni')::bigint,
               count(*) filter (where public._vital_rating(s.m, s.vv) = 'poor')::bigint,
               public._vital_rating(s.m, (percentile_cont(0.75) within group (order by s.vv))::numeric)
        from (
            select e.props->>'metric' as m, e.vital_value as vv
            from public.events e
            where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3
              and e.name = 'web_vital' and e.vital_value is not null and (%s)
        ) s
        where s.m is not null
        group by s.m
    $q$, w) using p_site, p_from, p_to;
end$$;

create or replace function public.analytics_vitals_timeseries(
    p_site uuid,
    p_from timestamptz,
    p_to timestamptz,
    p_metric text,
    p_granularity text default 'day',
    p_filters jsonb default '[]'::jsonb
) returns table (bucket timestamptz, p75 numeric, sample bigint)
language plpgsql stable security definer set search_path = public
as $$
declare
    w text := public._analytics_where(p_filters);
    g text := case when p_granularity in ('hour','day','week','month') then p_granularity else 'day' end;
begin
    return query execute format($q$
        select date_trunc(%L, e.created_at) as bucket,
               (percentile_cont(0.75) within group (order by e.vital_value))::numeric,
               count(*)::bigint
        from public.events e
        where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3
          and e.name = 'web_vital' and e.vital_value is not null
          and e.props->>'metric' = $4 and (%s)
        group by 1 order by 1
    $q$, g, w) using p_site, p_from, p_to, p_metric;
end$$;

create or replace function public.analytics_vitals_pages(
    p_site uuid,
    p_from timestamptz,
    p_to timestamptz,
    p_filters jsonb default '[]'::jsonb,
    p_limit int default 50
) returns table (
    path text, samples bigint,
    lcp numeric, cls numeric, inp numeric, fcp numeric, ttfb numeric
)
language plpgsql stable security definer set search_path = public
as $$
declare
    w text := public._analytics_where(p_filters);
    v_limit int := least(greatest(coalesce(p_limit, 50), 1), 200);
begin
    return query execute format($q$
        select e.path,
               count(*)::bigint as samples,
               (percentile_cont(0.75) within group (order by e.vital_value) filter (where e.props->>'metric' = 'LCP'))::numeric,
               (percentile_cont(0.75) within group (order by e.vital_value) filter (where e.props->>'metric' = 'CLS'))::numeric,
               (percentile_cont(0.75) within group (order by e.vital_value) filter (where e.props->>'metric' = 'INP'))::numeric,
               (percentile_cont(0.75) within group (order by e.vital_value) filter (where e.props->>'metric' = 'FCP'))::numeric,
               (percentile_cont(0.75) within group (order by e.vital_value) filter (where e.props->>'metric' = 'TTFB'))::numeric
        from public.events e
        where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3
          and e.name = 'web_vital' and e.vital_value is not null and (%s)
        group by e.path
        order by samples desc
        limit %s
    $q$, w, v_limit) using p_site, p_from, p_to;
end$$;

create or replace function public.analytics_vitals_breakdown(
    p_site uuid,
    p_from timestamptz,
    p_to timestamptz,
    p_dimension text,
    p_metric text,
    p_filters jsonb default '[]'::jsonb,
    p_limit int default 10
) returns table (value text, sample bigint, p75 numeric, rating text)
language plpgsql stable security definer set search_path = public
as $$
declare
    w text := public._analytics_where(p_filters);
    col text;
    v_limit int := least(greatest(coalesce(p_limit, 10), 1), 100);
begin
    if p_dimension not in ('device_type','browser','os','country','channel') then
        raise exception 'invalid vitals dimension %', p_dimension;
    end if;
    col := format('e.%I', p_dimension);
    return query execute format($q$
        select coalesce(%s::text, '(none)') as value,
               count(*)::bigint,
               (percentile_cont(0.75) within group (order by e.vital_value))::numeric as p75,
               public._vital_rating($4, (percentile_cont(0.75) within group (order by e.vital_value))::numeric)
        from public.events e
        where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3
          and e.name = 'web_vital' and e.vital_value is not null
          and e.props->>'metric' = $4 and (%s)
        group by 1 order by count(*) desc limit %s
    $q$, col, w, v_limit) using p_site, p_from, p_to, p_metric;
end$$;

create or replace function public.analytics_vitals_attribution(
    p_site uuid,
    p_from timestamptz,
    p_to timestamptz,
    p_path text,
    p_metric text,
    p_filters jsonb default '[]'::jsonb,
    p_limit int default 8
) returns table (element text, cnt bigint, p75 numeric)
language plpgsql stable security definer set search_path = public
as $$
declare
    w text := public._analytics_where(p_filters);
    v_limit int := least(greatest(coalesce(p_limit, 8), 1), 50);
begin
    return query execute format($q$
        select coalesce(nullif(e.props->>'element', ''), '(unattributed)') as element,
               count(*)::bigint,
               (percentile_cont(0.75) within group (order by e.vital_value))::numeric
        from public.events e
        where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3
          and e.name = 'web_vital' and e.vital_value is not null
          and e.props->>'metric' = $4 and e.path = $5
          and public._vital_rating($4, e.vital_value) <> 'good'
          and (%s)
        group by 1 order by count(*) desc limit %s
    $q$, w, v_limit) using p_site, p_from, p_to, p_metric, p_path;
end$$;
