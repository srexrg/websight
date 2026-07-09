-- Plan 08 milestone 2: per-goal stats for the goals table + sparkline series.

-- All active goals with their conversion stats in one call. Shares a single
-- visitor denominator (distinct sessionized visitors in range, filter-aware).
create or replace function public.analytics_goals_with_stats(
    p_site uuid,
    p_from timestamptz,
    p_to timestamptz,
    p_filters jsonb default '[]'::jsonb
) returns table (
    id uuid,
    name text,
    kind text,
    path_pattern text,
    path_op text,
    event_name text,
    prop_filters jsonb,
    value_cents int,
    currency text,
    conversions bigint,
    uniques bigint,
    visitors bigint,
    rate numeric
)
language plpgsql stable
security definer
set search_path = public
as $$
declare
    g public.goals;
    gw text;
    w text := public._analytics_where(p_filters);
    v_base bigint;
begin
    execute format($q$
        select count(distinct e.visitor_id) from public.events e
        where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3
          and e.session_id is not null and (%s)
    $q$, w) into v_base using p_site, p_from, p_to;

    for g in
        select * from public.goals
        where site_id = p_site and archived_at is null
        order by created_at
    loop
        gw := public._goal_where(g.kind, g.path_op, g.path_pattern, g.event_name, g.prop_filters);
        id := g.id; name := g.name; kind := g.kind;
        path_pattern := g.path_pattern; path_op := g.path_op; event_name := g.event_name;
        prop_filters := g.prop_filters; value_cents := g.value_cents; currency := g.currency;
        visitors := v_base;
        execute format($q$
            select count(*)::bigint, count(distinct e.visitor_id)::bigint
            from public.events e
            where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3 and (%s) and (%s)
        $q$, gw, w) into conversions, uniques using p_site, p_from, p_to;
        rate := case when v_base > 0 then round(uniques::numeric / v_base, 4) else 0 end;
        return next;
    end loop;
end;
$$;

-- Conversion timeseries for one goal (sparkline + goal detail chart).
create or replace function public.analytics_goal_timeseries(
    p_site uuid,
    p_from timestamptz,
    p_to timestamptz,
    p_goal uuid,
    p_granularity text default 'day',
    p_filters jsonb default '[]'::jsonb
) returns table (bucket timestamptz, conversions bigint, uniques bigint)
language plpgsql stable
security definer
set search_path = public
as $$
declare
    g public.goals;
    gw text;
    w text := public._analytics_where(p_filters);
    v_trunc text;
begin
    select * into g from public.goals where id = p_goal and site_id = p_site;
    if not found then
        raise exception 'goal not found';
    end if;
    v_trunc := case p_granularity
        when 'hour' then 'hour' when 'week' then 'week'
        when 'month' then 'month' when 'minute' then 'minute' else 'day' end;
    gw := public._goal_where(g.kind, g.path_op, g.path_pattern, g.event_name, g.prop_filters);

    return query execute format($q$
        select date_trunc(%L, e.created_at) as bucket,
               count(*)::bigint, count(distinct e.visitor_id)::bigint
        from public.events e
        where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3 and (%s) and (%s)
        group by 1 order by 1
    $q$, v_trunc, gw, w) using p_site, p_from, p_to;
end;
$$;

revoke all on function public.analytics_goals_with_stats(uuid, timestamptz, timestamptz, jsonb) from public, anon, authenticated;
revoke all on function public.analytics_goal_timeseries(uuid, timestamptz, timestamptz, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.analytics_goals_with_stats(uuid, timestamptz, timestamptz, jsonb) to service_role;
grant execute on function public.analytics_goal_timeseries(uuid, timestamptz, timestamptz, uuid, text, jsonb) to service_role;
