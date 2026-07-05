-- Plan 08 milestone 1: Goals & Conversions.
-- Goals are query-time definitions (Plausible model), not materialized flags:
-- a definition compiles to an events-aliased WHERE via _goal_where, so a goal
-- created today reports full historical data instantly.

create table if not exists public.goals (
    id uuid primary key default gen_random_uuid(),
    site_id uuid not null references public.sites(id) on delete cascade,
    name text not null,
    kind text not null check (kind in ('page', 'event')),
    path_pattern text,
    path_op text check (path_op in ('exact', 'contains', 'wildcard')),
    event_name text,
    prop_filters jsonb not null default '[]'::jsonb,
    value_cents int,
    currency char(3),
    archived_at timestamptz,
    created_by uuid,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
alter table public.goals enable row level security;  -- CRUD via owner-checked admin routes
create index if not exists goals_site_active_idx on public.goals (site_id) where archived_at is null;

-- Compile a goal definition into an events-aliased (alias `e`) WHERE fragment.
-- Reuses _analytics_where for an event goal's prop conditions (05 model).
create or replace function public._goal_where(
    p_kind text,
    p_path_op text,
    p_path_pattern text,
    p_event_name text,
    p_prop_filters jsonb
) returns text
language plpgsql
immutable
as $$
declare
    cond text;
    pw text;
    pat text;
begin
    if p_kind = 'page' then
        cond := 'e.name = ''pageview''';
        if p_path_pattern is not null and p_path_pattern <> '' then
            if p_path_op = 'exact' then
                cond := cond || format(' and e.path = %L', p_path_pattern);
            elsif p_path_op = 'contains' then
                cond := cond || format(' and e.path ilike %L',
                    '%' || replace(replace(replace(p_path_pattern, '\', '\\'), '%', '\%'), '_', '\_') || '%');
            elsif p_path_op = 'wildcard' then
                pat := replace(replace(replace(p_path_pattern, '\', '\\'), '%', '\%'), '_', '\_');
                pat := replace(pat, '*', '%');
                cond := cond || format(' and e.path like %L', pat);
            else
                raise exception 'invalid path_op %', p_path_op;
            end if;
        end if;
    elsif p_kind = 'event' then
        if p_event_name is null or p_event_name = '' then
            raise exception 'event goal requires event_name';
        end if;
        cond := format('e.name = %L', p_event_name);
        pw := public._analytics_where(p_prop_filters);
        if pw <> 'true' then
            cond := cond || ' and ' || pw;
        end if;
    else
        raise exception 'invalid goal kind %', p_kind;
    end if;
    return cond;
end;
$$;

-- Match count for an unsaved definition (the create/edit dialog preview).
create or replace function public.analytics_goal_preview(
    p_site uuid,
    p_from timestamptz,
    p_to timestamptz,
    p_kind text,
    p_path_op text,
    p_path_pattern text,
    p_event_name text,
    p_prop_filters jsonb default '[]'::jsonb
) returns table (conversions bigint, uniques bigint)
language plpgsql stable
security definer
set search_path = public
as $$
declare
    gw text := public._goal_where(p_kind, p_path_op, p_path_pattern, p_event_name, p_prop_filters);
begin
    return query execute format($q$
        select count(*)::bigint,
               count(distinct e.visitor_id)::bigint
        from public.events e
        where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3 and (%s)
    $q$, gw) using p_site, p_from, p_to;
end;
$$;

-- Stats for a saved goal: total conversions, unique converters, the visitor
-- denominator (all sessionized visitors in range, filter-aware), rate, value.
create or replace function public.analytics_goal_stats(
    p_site uuid,
    p_from timestamptz,
    p_to timestamptz,
    p_goal uuid,
    p_filters jsonb default '[]'::jsonb
) returns table (
    conversions bigint,
    uniques bigint,
    visitors bigint,
    rate numeric,
    value_cents bigint
)
language plpgsql stable
security definer
set search_path = public
as $$
declare
    g public.goals;
    gw text;
    w text := public._analytics_where(p_filters);
begin
    select * into g from public.goals where id = p_goal and site_id = p_site;
    if not found then
        raise exception 'goal not found';
    end if;
    gw := public._goal_where(g.kind, g.path_op, g.path_pattern, g.event_name, g.prop_filters);

    return query execute format($q$
        with conv as (
            select e.visitor_id, count(*) as c
            from public.events e
            where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3
              and (%s) and (%s)
            group by e.visitor_id
        ),
        base as (
            select count(distinct e.visitor_id) as v
            from public.events e
            where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3
              and e.session_id is not null and (%s)
        )
        select coalesce(sum(c.c), 0)::bigint,
               count(c.visitor_id)::bigint,
               (select v from base)::bigint,
               case when (select v from base) > 0
                    then round(count(c.visitor_id)::numeric / (select v from base), 4)
                    else 0 end,
               (count(c.visitor_id) * coalesce($4, 0))::bigint
        from conv c
    $q$, gw, w, w) using p_site, p_from, p_to, g.value_cents;
end;
$$;

revoke all on function public._goal_where(text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.analytics_goal_preview(uuid, timestamptz, timestamptz, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.analytics_goal_stats(uuid, timestamptz, timestamptz, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.analytics_goal_preview(uuid, timestamptz, timestamptz, text, text, text, text, jsonb) to service_role;
grant execute on function public.analytics_goal_stats(uuid, timestamptz, timestamptz, uuid, jsonb) to service_role;
