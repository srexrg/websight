-- Plan 07 milestone 2: Session event timeline.
-- Ordered events for one session, scoped to an owned site. No 05 filters here -
-- you are inspecting a single session. Capped to guard pathological sessions.

create or replace function public.analytics_session_events(
    p_site uuid,
    p_session uuid,
    p_limit int default 500
) returns table (
    id bigint,
    name text,
    path text,
    title text,
    created_at timestamptz,
    referrer_domain text,
    props jsonb
)
language sql stable
security definer
set search_path = public
as $$
    select e.id, e.name, e.path, e.title, e.created_at, e.referrer_domain, e.props
    from public.events e
    where e.site_id = p_site and e.session_id = p_session
    order by e.created_at asc, e.id asc
    limit least(greatest(coalesce(p_limit, 500), 1), 2000);
$$;

revoke all on function public.analytics_session_events(uuid, uuid, int) from public, anon, authenticated;
grant execute on function public.analytics_session_events(uuid, uuid, int) to service_role;
