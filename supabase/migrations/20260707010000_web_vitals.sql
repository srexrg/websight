-- Plan 12: Web Vitals / performance monitoring.
-- Vitals arrive as web_vital events: props {metric, value, rating, element?,
-- loadState?}. We never trust the stored rating (thresholds can change); the
-- rating is always recomputed from the raw value at query time via
-- _vital_rating. A regex-guarded generated column exposes the numeric value for
-- cheap percentile scans, and a partial index locates the vital rows.

-- Numeric value, only for web_vital rows whose value is numeric-looking (the
-- regex guard means the stored expression can never fail the row insert even if
-- some other event ships a non-numeric props.value).
alter table public.events
    add column if not exists vital_value numeric
    generated always as (
        case
            when name = 'web_vital' and props->>'value' ~ '^-?[0-9]+(\.[0-9]+)?$'
            then (props->>'value')::numeric
        end
    ) stored;

create index if not exists events_vital_idx
    on public.events (site_id, created_at)
    where name = 'web_vital';

-- Google Core Web Vitals thresholds (good / needs-improvement / poor). The one
-- source of truth for rating; historical rows re-rate automatically if these
-- ever change. CLS is unitless; the rest are milliseconds.
create or replace function public._vital_rating(m text, v numeric)
returns text
language sql
immutable
as $$
    select case m
        when 'LCP'  then case when v <= 2500 then 'good' when v <= 4000 then 'ni' else 'poor' end
        when 'CLS'  then case when v <= 0.1  then 'good' when v <= 0.25 then 'ni' else 'poor' end
        when 'INP'  then case when v <= 200  then 'good' when v <= 500  then 'ni' else 'poor' end
        when 'FCP'  then case when v <= 1800 then 'good' when v <= 3000 then 'ni' else 'poor' end
        when 'TTFB' then case when v <= 800  then 'good' when v <= 1800 then 'ni' else 'poor' end
    end
$$;

-- p75 + rating distribution per metric (the header cards).
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
               percentile_cont(0.75) within group (order by s.vv),
               count(*) filter (where public._vital_rating(s.m, s.vv) = 'good')::bigint,
               count(*) filter (where public._vital_rating(s.m, s.vv) = 'ni')::bigint,
               count(*) filter (where public._vital_rating(s.m, s.vv) = 'poor')::bigint,
               public._vital_rating(s.m, percentile_cont(0.75) within group (order by s.vv))
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

-- p75 timeseries for one metric.
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
               percentile_cont(0.75) within group (order by e.vital_value),
               count(*)::bigint
        from public.events e
        where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3
          and e.name = 'web_vital' and e.vital_value is not null
          and e.props->>'metric' = $4 and (%s)
        group by 1 order by 1
    $q$, g, w) using p_site, p_from, p_to, p_metric;
end$$;

-- Per-path p75 for all five metrics + total samples (the pages table).
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
               percentile_cont(0.75) within group (order by e.vital_value) filter (where e.props->>'metric' = 'LCP'),
               percentile_cont(0.75) within group (order by e.vital_value) filter (where e.props->>'metric' = 'CLS'),
               percentile_cont(0.75) within group (order by e.vital_value) filter (where e.props->>'metric' = 'INP'),
               percentile_cont(0.75) within group (order by e.vital_value) filter (where e.props->>'metric' = 'FCP'),
               percentile_cont(0.75) within group (order by e.vital_value) filter (where e.props->>'metric' = 'TTFB')
        from public.events e
        where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3
          and e.name = 'web_vital' and e.vital_value is not null and (%s)
        group by e.path
        order by samples desc
        limit %s
    $q$, w, v_limit) using p_site, p_from, p_to;
end$$;

-- p75 per dimension value for one metric (device/browser/country breakdowns).
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
               percentile_cont(0.75) within group (order by e.vital_value) as p75,
               public._vital_rating($4, percentile_cont(0.75) within group (order by e.vital_value))
        from public.events e
        where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3
          and e.name = 'web_vital' and e.vital_value is not null
          and e.props->>'metric' = $4 and (%s)
        group by 1 order by count(*) desc limit %s
    $q$, col, w, v_limit) using p_site, p_from, p_to, p_metric;
end$$;

-- Top attributed elements among non-good loads for one path + metric.
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
               percentile_cont(0.75) within group (order by e.vital_value)
        from public.events e
        where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3
          and e.name = 'web_vital' and e.vital_value is not null
          and e.props->>'metric' = $4 and e.path = $5
          and public._vital_rating($4, e.vital_value) <> 'good'
          and (%s)
        group by 1 order by count(*) desc limit %s
    $q$, w, v_limit) using p_site, p_from, p_to, p_metric, p_path;
end$$;

revoke all on function public.analytics_vitals_summary(uuid, timestamptz, timestamptz, jsonb) from public, anon, authenticated;
revoke all on function public.analytics_vitals_timeseries(uuid, timestamptz, timestamptz, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.analytics_vitals_pages(uuid, timestamptz, timestamptz, jsonb, int) from public, anon, authenticated;
revoke all on function public.analytics_vitals_breakdown(uuid, timestamptz, timestamptz, text, text, jsonb, int) from public, anon, authenticated;
revoke all on function public.analytics_vitals_attribution(uuid, timestamptz, timestamptz, text, text, jsonb, int) from public, anon, authenticated;
grant execute on function public.analytics_vitals_summary(uuid, timestamptz, timestamptz, jsonb) to service_role;
grant execute on function public.analytics_vitals_timeseries(uuid, timestamptz, timestamptz, text, text, jsonb) to service_role;
grant execute on function public.analytics_vitals_pages(uuid, timestamptz, timestamptz, jsonb, int) to service_role;
grant execute on function public.analytics_vitals_breakdown(uuid, timestamptz, timestamptz, text, text, jsonb, int) to service_role;
grant execute on function public.analytics_vitals_attribution(uuid, timestamptz, timestamptz, text, text, jsonb, int) to service_role;
