-- Plan 10 milestone 1: session path sequences for journey analysis.
-- Returns the ordered pageview-path array for each session in range (filter-
-- aware). Sequence -> Sankey aggregation happens in the route handler (sessions
-- are small); this RPC only assembles the per-session ordered paths.

create or replace function public.analytics_session_paths(
    p_site uuid,
    p_from timestamptz,
    p_to timestamptz,
    p_filters jsonb default '[]'::jsonb,
    p_limit int default 200000
) returns table (paths text[])
language plpgsql stable
security definer
set search_path = public
as $$
declare
    w text := public._analytics_where(p_filters);
    v_limit int := least(greatest(coalesce(p_limit, 200000), 1), 500000);
begin
    if w = 'true' then
        return query
            select array_agg(e.path order by e.created_at, e.id)
            from public.events e
            where e.site_id = p_site and e.created_at >= p_from and e.created_at < p_to
              and e.name = 'pageview' and e.session_id is not null
            group by e.session_id
            limit v_limit;
        return;
    end if;

    return query execute format($q$
        select array_agg(e.path order by e.created_at, e.id)
        from public.events e
        where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3
          and e.name = 'pageview' and e.session_id is not null
          and e.session_id in (
              select e2.session_id from public.events e2
              where e2.site_id = $1 and e2.created_at >= $2 and e2.created_at < $3
                and e2.session_id is not null and (%s)
          )
        group by e.session_id
        limit $4
    $q$, w) using p_site, p_from, p_to, v_limit;
end;
$$;

revoke all on function public.analytics_session_paths(uuid, timestamptz, timestamptz, jsonb, int) from public, anon, authenticated;
grant execute on function public.analytics_session_paths(uuid, timestamptz, timestamptz, jsonb, int) to service_role;
