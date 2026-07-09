-- Plan 11 milestone 1+3: cohort retention.
-- Query-time cohort retention (PostHog model). A cohort = the interval bucket
-- (in site timezone) of an identity's FIRST entry; a cell = distinct identities
-- from that cohort who "returned" in a later bucket. Entry and return default
-- to any-session (first-seen / any-visit); each can instead be a saved goal
-- (reusing the 08 _goal_where compiler) for event-based cohorts. Filters (05)
-- scope membership. Identity = user_id when present (cross-device), else
-- visitor_id, so this is meaningful only for persistent-mode sites (the screen
-- guards stateless sites with an explainer).
--
-- Buckets are emitted as 'YYYY-MM-DD' wall-clock strings (fixed-width ISO ->
-- lexical sort = chronological), so the route/lib derive the period index and
-- the in-progress bucket without timezone math in JS. now_bucket is returned so
-- the current (incomplete) interval can be rendered as such, not as bad
-- retention. No new tables; relies on the sessions(site_id,visitor_id,
-- started_at) index from plan 07.

create or replace function public.analytics_retention(
    p_site uuid,
    p_from timestamptz,
    p_to timestamptz,
    p_interval text,
    p_tz text default 'UTC',
    p_filters jsonb default '[]'::jsonb,
    p_entry_goal uuid default null,
    p_return_goal uuid default null
) returns table (cohort text, active text, cnt bigint, cohort_size bigint, now_bucket text)
language plpgsql stable
security definer
set search_path = public
as $$
declare
    w text := public._analytics_where(p_filters);
    fclause text := '';   -- session-source restriction for the global filter
    eclause text := '';   -- event-source restriction for the global filter
    entry_src text;
    return_src text;
    g public.goals;
    ew text;
    rw text;
    bexpr_s text;
    bexpr_e text;
begin
    if p_interval not in ('day', 'week', 'month') then
        raise exception 'invalid interval %', p_interval;
    end if;

    if w <> 'true' then
        fclause := format(
            ' and s.id in (select e.session_id from public.events e '
            'where e.site_id = $1 and e.created_at < $3 '
            'and e.session_id is not null and (%s))', w);
        eclause := format(' and (%s)', w);
    end if;

    bexpr_s := format('to_char(date_trunc(%L, (s.started_at at time zone %L)), ''YYYY-MM-DD'')', p_interval, p_tz);
    bexpr_e := format('to_char(date_trunc(%L, (e.created_at at time zone %L)), ''YYYY-MM-DD'')', p_interval, p_tz);

    -- Entry source (defines cohorts): sessions, or events matching a saved goal.
    if p_entry_goal is null then
        entry_src := format(
            'select coalesce(nullif(s.user_id, ''''), s.visitor_id) as ident, %s as bucket '
            'from public.sessions s where s.site_id = $1 and s.started_at < $3%s',
            bexpr_s, fclause);
    else
        select * into g from public.goals where id = p_entry_goal and site_id = p_site;
        if not found then raise exception 'entry goal not found'; end if;
        ew := public._goal_where(g.kind, g.path_op, g.path_pattern, g.event_name, g.prop_filters);
        entry_src := format(
            'select coalesce(nullif(e.user_id, ''''), e.visitor_id) as ident, %s as bucket '
            'from public.events e where e.site_id = $1 and e.created_at < $3 and (%s)%s',
            bexpr_e, ew, eclause);
    end if;

    -- Return source (defines activity): sessions, or events matching a saved goal.
    if p_return_goal is null then
        return_src := format(
            'select coalesce(nullif(s.user_id, ''''), s.visitor_id) as ident, %s as bucket '
            'from public.sessions s where s.site_id = $1 and s.started_at < $3%s',
            bexpr_s, fclause);
    else
        select * into g from public.goals where id = p_return_goal and site_id = p_site;
        if not found then raise exception 'return goal not found'; end if;
        rw := public._goal_where(g.kind, g.path_op, g.path_pattern, g.event_name, g.prop_filters);
        return_src := format(
            'select coalesce(nullif(e.user_id, ''''), e.visitor_id) as ident, %s as bucket '
            'from public.events e where e.site_id = $1 and e.created_at < $3 and (%s)%s',
            bexpr_e, rw, eclause);
    end if;

    return query execute format($q$
        with entry_src as (%s),
             return_src as (%s),
             firsts as (select ident, min(bucket) as cohort from entry_src group by ident),
             cohorts as (
                 select ident, cohort from firsts
                 where cohort >= to_char(date_trunc(%L, ($2 at time zone %L)), 'YYYY-MM-DD')
             ),
             sizes as (select cohort, count(*)::bigint as sz from cohorts group by cohort),
             ret as (select distinct ident, bucket from return_src)
        select c.cohort,
               a.bucket as active,
               count(distinct a.ident)::bigint as cnt,
               (select sz from sizes where sizes.cohort = c.cohort) as cohort_size,
               to_char(date_trunc(%L, (now() at time zone %L)), 'YYYY-MM-DD') as now_bucket
        from cohorts c
        join ret a on a.ident = c.ident and a.bucket >= c.cohort
        group by c.cohort, a.bucket
    $q$, entry_src, return_src, p_interval, p_tz, p_interval, p_tz)
    using p_site, p_from, p_to;
end;
$$;

-- Cell drill-down (M4): the identities from one cohort who returned in one
-- period. The route passes the two bucket strings straight from the grid it
-- already rendered, so no period arithmetic happens in SQL.
create or replace function public.analytics_retention_visitors(
    p_site uuid,
    p_from timestamptz,
    p_to timestamptz,
    p_interval text,
    p_cohort text,
    p_active text,
    p_tz text default 'UTC',
    p_filters jsonb default '[]'::jsonb,
    p_entry_goal uuid default null,
    p_return_goal uuid default null,
    p_limit int default 100
) returns table (profile_key text, visitor_id text, user_id text)
language plpgsql stable
security definer
set search_path = public
as $$
declare
    w text := public._analytics_where(p_filters);
    fclause text := '';
    eclause text := '';
    entry_src text;
    return_src text;
    g public.goals;
    ew text;
    rw text;
    bexpr_s text;
    bexpr_e text;
    v_limit int := least(greatest(coalesce(p_limit, 100), 1), 500);
begin
    if p_interval not in ('day', 'week', 'month') then
        raise exception 'invalid interval %', p_interval;
    end if;

    -- Numbering: $1 = p_site, $2 = p_to, $3 = p_cohort, $4 = p_active
    -- (p_from is unused here - cohort assignment needs full history).
    if w <> 'true' then
        fclause := format(
            ' and s.id in (select e.session_id from public.events e '
            'where e.site_id = $1 and e.created_at < $2 '
            'and e.session_id is not null and (%s))', w);
        eclause := format(' and (%s)', w);
    end if;

    bexpr_s := format('to_char(date_trunc(%L, (s.started_at at time zone %L)), ''YYYY-MM-DD'')', p_interval, p_tz);
    bexpr_e := format('to_char(date_trunc(%L, (e.created_at at time zone %L)), ''YYYY-MM-DD'')', p_interval, p_tz);

    if p_entry_goal is null then
        entry_src := format(
            'select coalesce(nullif(s.user_id, ''''), s.visitor_id) as ident, '
            '(array_agg(s.visitor_id order by s.started_at))[1] as vid, %s as bucket '
            'from public.sessions s where s.site_id = $1 and s.started_at < $2%s '
            'group by ident, bucket', bexpr_s, fclause);
    else
        select * into g from public.goals where id = p_entry_goal and site_id = p_site;
        if not found then raise exception 'entry goal not found'; end if;
        ew := public._goal_where(g.kind, g.path_op, g.path_pattern, g.event_name, g.prop_filters);
        entry_src := format(
            'select coalesce(nullif(e.user_id, ''''), e.visitor_id) as ident, '
            '(array_agg(e.visitor_id order by e.created_at))[1] as vid, %s as bucket '
            'from public.events e where e.site_id = $1 and e.created_at < $2 and (%s)%s '
            'group by ident, bucket', bexpr_e, ew, eclause);
    end if;

    if p_return_goal is null then
        return_src := format(
            'select coalesce(nullif(s.user_id, ''''), s.visitor_id) as ident, %s as bucket '
            'from public.sessions s where s.site_id = $1 and s.started_at < $2%s',
            bexpr_s, fclause);
    else
        select * into g from public.goals where id = p_return_goal and site_id = p_site;
        if not found then raise exception 'return goal not found'; end if;
        rw := public._goal_where(g.kind, g.path_op, g.path_pattern, g.event_name, g.prop_filters);
        return_src := format(
            'select coalesce(nullif(e.user_id, ''''), e.visitor_id) as ident, %s as bucket '
            'from public.events e where e.site_id = $1 and e.created_at < $2 and (%s)%s',
            bexpr_e, rw, eclause);
    end if;

    return query execute format($q$
        with entry_src as (%s),
             firsts as (
                 select ident, (array_agg(vid order by bucket))[1] as vid, min(bucket) as cohort
                 from entry_src group by ident
             ),
             cohorts as (select ident, vid, cohort from firsts where cohort = $3),
             return_src as (%s),
             ret as (select distinct ident, bucket from return_src)
        select c.ident as profile_key, c.vid as visitor_id,
               case when c.ident <> c.vid then c.ident else null end as user_id
        from cohorts c
        join ret a on a.ident = c.ident and a.bucket = $4
        order by c.ident
        limit %s
    $q$, entry_src, return_src, v_limit)
    using p_site, p_to, p_cohort, p_active;
end;
$$;

revoke all on function public.analytics_retention(uuid, timestamptz, timestamptz, text, text, jsonb, uuid, uuid) from public, anon, authenticated;
revoke all on function public.analytics_retention_visitors(uuid, timestamptz, timestamptz, text, text, text, text, jsonb, uuid, uuid, int) from public, anon, authenticated;
grant execute on function public.analytics_retention(uuid, timestamptz, timestamptz, text, text, jsonb, uuid, uuid) to service_role;
grant execute on function public.analytics_retention_visitors(uuid, timestamptz, timestamptz, text, text, text, text, jsonb, uuid, uuid, int) to service_role;
