-- Plan 09 milestone 3: funnel step drill-down.
-- Return the visitors who converted to (or dropped off at) a given step.

-- Shared builder: the per-visitor funnel base subquery (columns visitor_id,
-- t1..tN) as a SQL string with $1=site $2=from $3=to $4=window_minutes bind
-- placeholders. p_where is the entry filter (spliced into step 1). Mirrors
-- analytics_funnel's inline base.
create or replace function public._funnel_base_sql(p_steps jsonb, p_where text default 'true')
returns text
language plpgsql stable
security definer
set search_path = public
as $$
declare
    n int := jsonb_array_length(p_steps);
    conds text[] := '{}';
    base text;
    i int;
    prev_t text;
begin
    if n is null or n < 2 or n > 8 then
        raise exception 'funnel needs 2-8 steps';
    end if;
    for i in 1..n loop
        conds := conds || public._funnel_step_where(p_steps->(i - 1));
    end loop;

    base := 'select b.visitor_id, b.t1';
    for i in 2..n loop
        base := base || format(', x%s.t%s', i, i);
    end loop;
    base := base || format(
        ' from (select e.visitor_id, min(e.created_at) t1 from public.events e'
        || ' where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3'
        || ' and e.session_id is not null and (%s) and (%s) group by 1) b',
        conds[1], p_where);
    for i in 2..n loop
        prev_t := case when i = 2 then 'b.t1' else format('x%s.t%s', i - 1, i - 1) end;
        base := base || format(
            ' left join lateral (select min(e.created_at) t%s from public.events e'
            || ' where e.site_id = $1 and e.visitor_id = b.visitor_id and (%s)'
            || ' and e.created_at > %s and e.created_at <= b.t1 + make_interval(mins => $4)) x%s on true',
            i, conds[i], prev_t, i);
    end loop;
    return base;
end;
$$;
revoke all on function public._funnel_base_sql(jsonb, text) from public, anon, authenticated;

-- Visitors at a step outcome. converted = reached p_step; dropped = reached
-- p_step-1 but not p_step. user_id resolved from the visitor's sessions.
create or replace function public.analytics_funnel_step_visitors(
    p_site uuid,
    p_from timestamptz,
    p_to timestamptz,
    p_steps jsonb,
    p_window_minutes int,
    p_step int,
    p_outcome text,
    p_limit int default 50,
    p_offset int default 0,
    p_filters jsonb default '[]'::jsonb
) returns table (visitor_id text, user_id text)
language plpgsql stable
security definer
set search_path = public
as $$
declare
    n int := jsonb_array_length(p_steps);
    base text := public._funnel_base_sql(p_steps, public._analytics_where(p_filters));
    cond text;
    q text;
    v_limit int := least(greatest(coalesce(p_limit, 50), 1), 200);
begin
    if p_step < 1 or p_step > n then
        raise exception 'step out of range';
    end if;
    if p_outcome = 'converted' then
        cond := format('sub.t%s is not null', p_step);
    elsif p_outcome = 'dropped' then
        if p_step < 2 then return; end if;
        cond := format('sub.t%s is not null and sub.t%s is null', p_step - 1, p_step);
    else
        raise exception 'invalid outcome %', p_outcome;
    end if;

    q := format(
        'select sub.visitor_id,'
        || ' (select s.user_id from public.sessions s where s.site_id = $1'
        || '  and s.visitor_id = sub.visitor_id and s.user_id is not null limit 1) as user_id'
        || ' from (%s) sub where %s order by sub.t1 desc limit $5 offset $6',
        base, cond);
    return query execute q using p_site, p_from, p_to, p_window_minutes, v_limit, greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke all on function public.analytics_funnel_step_visitors(uuid, timestamptz, timestamptz, jsonb, int, int, text, int, int, jsonb) from public, anon, authenticated;
grant execute on function public.analytics_funnel_step_visitors(uuid, timestamptz, timestamptz, jsonb, int, int, text, int, int, jsonb) to service_role;
