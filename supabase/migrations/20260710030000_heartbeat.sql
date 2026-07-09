-- Heartbeat presence (docs/redesign/06). While a visitor's tab is visible the
-- tracker sends a lightweight ping; each ping only bumps the open session's
-- last_event_at - it never inserts an event, so metrics, feeds and rollups are
-- untouched. When the tab closes the pings stop, so the visitor drops off within
-- the (now shorter, 2-minute) live window instead of lingering for five.
--
-- Presence therefore reads session activity: the "N online" count counts
-- sessions active in the window (heartbeat-aware) when unfiltered, keeping the
-- event-based path only for filtered counts (pings carry no page/geo to filter).

create or replace function public.ingest_heartbeat(p_site uuid, p_visitor text)
returns void
language sql
security definer
set search_path = public
as $$
    update public.sessions
       set last_event_at = now()
     where site_id = p_site and visitor_id = p_visitor and is_open;
$$;

revoke all on function public.ingest_heartbeat(uuid, text) from public, anon, authenticated;
grant execute on function public.ingest_heartbeat(uuid, text) to service_role;

create or replace function public.analytics_live_count(
    p_site uuid,
    p_minutes int default 2,
    p_filters jsonb default '[]'::jsonb
) returns bigint
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    w text := public._analytics_where(p_filters);
    m int := least(greatest(p_minutes, 1), 60);
    result bigint;
begin
    if w = 'true' then
        -- Heartbeat-aware presence: sessions active in the window.
        select count(distinct s.visitor_id) into result
        from public.sessions s
        where s.site_id = p_site
          and s.last_event_at > now() - make_interval(mins => m);
        return coalesce(result, 0);
    end if;
    -- Filtered: fall back to event activity (pings have no page/geo).
    execute format($q$
        select count(distinct e.visitor_id)
        from public.events e
        where e.site_id = $1
          and e.created_at > now() - make_interval(mins => $2)
          and e.session_id is not null and %s
    $q$, w) into result using p_site, m;
    return coalesce(result, 0);
end;
$$;
