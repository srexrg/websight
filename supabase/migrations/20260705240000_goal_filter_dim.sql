-- Plan 08 milestone 3: goal as a filter dimension.
-- Lets any screen scope to a goal's converters by adding {dim:'goal'} to the
-- 05 filter model. Implemented as session membership: a session "converted" a
-- goal if it has a matching event.

-- Uncorrelated subquery of the session_ids that converted a goal. Uncorrelated
-- (site pinned by literal) so it can alias events as `e` without colliding with
-- the outer analytics query's `e` - _goal_where stays unchanged.
create or replace function public._goal_session_subquery(p_goal uuid)
returns text
language plpgsql stable
security definer
set search_path = public
as $$
declare
    g public.goals;
    gw text;
begin
    select * into g from public.goals where id = p_goal;
    if not found then
        return '(select null::uuid where false)';
    end if;
    gw := public._goal_where(g.kind, g.path_op, g.path_pattern, g.event_name, g.prop_filters);
    return format(
        '(select e.session_id from public.events e where e.site_id = %L::uuid and e.session_id is not null and (%s))',
        g.site_id, gw);
end;
$$;
revoke all on function public._goal_session_subquery(uuid) from public, anon, authenticated;

-- Teach _analytics_where the 'goal' dimension. Now STABLE (was immutable)
-- because it resolves goal definitions from the catalog. Every other dimension
-- is reproduced verbatim; the goal branch is isolated and continues early.
create or replace function public._analytics_where(p_filters jsonb)
returns text
language plpgsql stable
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

        -- Goal membership (isolated branch).
        if dim = 'goal' then
            if op in ('is', 'contains') then
                select string_agg(
                    format('e.session_id in %s',
                        case when x ~ '^[0-9a-fA-F-]{36}$'
                             then public._goal_session_subquery(x::uuid)
                             else '(select null::uuid where false)' end),
                    ' or ')
                  into cond from unnest(vals) x;
            else
                select string_agg(
                    format('e.session_id not in %s',
                        case when x ~ '^[0-9a-fA-F-]{36}$'
                             then public._goal_session_subquery(x::uuid)
                             else '(select null::uuid where false)' end),
                    ' and ')
                  into cond from unnest(vals) x;
            end if;
            conds := conds || format('(%s)', cond);
            continue;
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
