-- Plan 07 milestone 1: Sessions list.
-- Keyset-paginated, filter-aware read of the sessions table. Filters (05 model)
-- are event-scoped, so a session matches when it has an event satisfying the
-- filter WHERE (same pattern as analytics_breakdown's entry_path/exit_path).

-- Keyset pagination index: newest-first with an id tiebreak.
create index if not exists sessions_site_started_id_idx
    on public.sessions (site_id, started_at desc, id desc);

create or replace function public.analytics_sessions_list(
    p_site uuid,
    p_from timestamptz,
    p_to timestamptz,
    p_cursor_started timestamptz default null,
    p_cursor_id uuid default null,
    p_limit int default 50,
    p_filters jsonb default '[]'::jsonb
) returns table (
    id uuid,
    visitor_id text,
    user_id text,
    started_at timestamptz,
    last_event_at timestamptz,
    duration_s int,
    entry_path text,
    exit_path text,
    pageviews int,
    events int,
    is_bounce boolean,
    is_open boolean,
    referrer_domain text,
    channel text,
    country text,
    region text,
    city text,
    device_type text,
    browser text,
    os text
)
language plpgsql stable
security definer
set search_path = public
as $$
declare
    w text := public._analytics_where(p_filters);
    v_limit int := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
    if w = 'true' then
        -- Fast path: no filters, pure index scan on sessions.
        return query
            select s.id, s.visitor_id, s.user_id, s.started_at, s.last_event_at,
                   s.duration_s, s.entry_path, s.exit_path, s.pageviews, s.events,
                   s.is_bounce, s.is_open, s.referrer_domain, s.channel,
                   s.country::text, s.region, s.city, s.device_type, s.browser, s.os
            from public.sessions s
            where s.site_id = p_site
              and s.started_at >= p_from and s.started_at < p_to
              and (p_cursor_started is null
                   or (s.started_at, s.id) < (p_cursor_started, p_cursor_id))
            order by s.started_at desc, s.id desc
            limit v_limit;
        return;
    end if;

    return query execute format($q$
        select s.id, s.visitor_id, s.user_id, s.started_at, s.last_event_at,
               s.duration_s, s.entry_path, s.exit_path, s.pageviews, s.events,
               s.is_bounce, s.is_open, s.referrer_domain, s.channel,
               s.country::text, s.region, s.city, s.device_type, s.browser, s.os
        from public.sessions s
        where s.site_id = $1 and s.started_at >= $2 and s.started_at < $3
          and ($4::timestamptz is null or (s.started_at, s.id) < ($4, $5))
          and s.id in (
              select e.session_id from public.events e
              where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3
                and e.session_id is not null and %s
          )
        order by s.started_at desc, s.id desc
        limit $6
    $q$, w) using p_site, p_from, p_to, p_cursor_started, p_cursor_id, v_limit;
end;
$$;

revoke all on function public.analytics_sessions_list(uuid, timestamptz, timestamptz, timestamptz, uuid, int, jsonb) from public, anon, authenticated;
grant execute on function public.analytics_sessions_list(uuid, timestamptz, timestamptz, timestamptz, uuid, int, jsonb) to service_role;
