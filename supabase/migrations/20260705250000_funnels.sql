-- Plan 09 milestone 1: Funnels.
-- Query-time, sequential multi-step funnels over `events`. Steps reuse the
-- goal/filter compilers (08). A funnel is computed as a lateral-join chain: for
-- each visitor, earliest step-1 match in range, then earliest step-i match
-- after step-(i-1) and within the conversion window measured from step 1.

create table if not exists public.funnels (
    id uuid primary key default gen_random_uuid(),
    site_id uuid not null references public.sites(id) on delete cascade,
    name text not null,
    steps jsonb not null default '[]'::jsonb,
    window_minutes int not null default 1440,
    base_filters jsonb not null default '[]'::jsonb,
    created_by uuid,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    archived_at timestamptz
);
alter table public.funnels enable row level security;  -- CRUD via owner-checked routes
create index if not exists funnels_site_active_idx on public.funnels (site_id) where archived_at is null;

-- Compile one funnel step (page | event | goal) to an events-aliased (`e`)
-- condition, reusing the goal compiler.
create or replace function public._funnel_step_where(p_step jsonb)
returns text
language plpgsql stable
security definer
set search_path = public
as $$
declare
    k text := p_step->>'kind';
    g public.goals;
    gid text;
begin
    if k = 'page' then
        return public._goal_where('page', p_step->>'pathOp', p_step->>'pathPattern', null, '[]'::jsonb);
    elsif k = 'event' then
        return public._goal_where('event', null, null, p_step->>'eventName',
                                  coalesce(p_step->'propFilters', '[]'::jsonb));
    elsif k = 'goal' then
        gid := p_step->>'goalId';
        if gid is null or gid !~ '^[0-9a-fA-F-]{36}$' then return 'false'; end if;
        select * into g from public.goals where id = gid::uuid;
        if not found then return 'false'; end if;
        return public._goal_where(g.kind, g.path_op, g.path_pattern, g.event_name, g.prop_filters);
    else
        raise exception 'invalid funnel step kind %', k;
    end if;
end;
$$;
revoke all on function public._funnel_step_where(jsonb) from public, anon, authenticated;

-- Sequential funnel: per-step unique visitors + median seconds from the prior
-- step. Window (minutes) is measured from each visitor's step-1 timestamp.
create or replace function public.analytics_funnel(
    p_site uuid,
    p_from timestamptz,
    p_to timestamptz,
    p_steps jsonb,
    p_window_minutes int,
    p_filters jsonb default '[]'::jsonb
) returns table (step int, visitors bigint, median_from_prev_s numeric)
language plpgsql stable
security definer
set search_path = public
as $$
declare
    n int := jsonb_array_length(p_steps);
    w text := public._analytics_where(p_filters);
    conds text[] := '{}';
    base text;
    outer_counts text;
    outer_medians text;
    q text;
    i int;
    prev_t text;
    v_counts bigint[];
    v_medians numeric[];
begin
    if n is null or n < 2 or n > 8 then
        raise exception 'funnel needs 2-8 steps';
    end if;
    for i in 1..n loop
        conds := conds || public._funnel_step_where(p_steps->(i - 1));
    end loop;

    -- Base: entrants (step 1), then a lateral join per subsequent step.
    base := 'select b.visitor_id, b.t1';
    for i in 2..n loop
        base := base || format(', x%s.t%s', i, i);
    end loop;
    base := base || format(
        ' from (select e.visitor_id, min(e.created_at) t1 from public.events e'
        || ' where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3'
        || ' and e.session_id is not null and (%s) and (%s) group by 1) b',
        conds[1], w);
    for i in 2..n loop
        prev_t := case when i = 2 then 'b.t1' else format('x%s.t%s', i - 1, i - 1) end;
        base := base || format(
            ' left join lateral (select min(e.created_at) t%s from public.events e'
            || ' where e.site_id = $1 and e.visitor_id = b.visitor_id and (%s)'
            || ' and e.created_at > %s and e.created_at <= b.t1 + make_interval(mins => $4)) x%s on true',
            i, conds[i], prev_t, i);
    end loop;

    outer_counts := 'count(sub.t1)';
    outer_medians := 'null::numeric';
    for i in 2..n loop
        outer_counts := outer_counts || format(', count(sub.t%s)', i);
        outer_medians := outer_medians || format(
            ', percentile_cont(0.5) within group (order by extract(epoch from (sub.t%s - sub.t%s)))',
            i, i - 1);
    end loop;

    q := format('select array[%s]::bigint[], array[%s]::numeric[] from (%s) sub',
                outer_counts, outer_medians, base);
    execute q into v_counts, v_medians using p_site, p_from, p_to, p_window_minutes;

    for i in 1..n loop
        step := i;
        visitors := v_counts[i];
        median_from_prev_s := v_medians[i];
        return next;
    end loop;
end;
$$;

revoke all on function public.analytics_funnel(uuid, timestamptz, timestamptz, jsonb, int, jsonb) from public, anon, authenticated;
grant execute on function public.analytics_funnel(uuid, timestamptz, timestamptz, jsonb, int, jsonb) to service_role;
