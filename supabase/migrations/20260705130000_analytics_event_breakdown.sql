-- Custom-event breakdown for the Events screen (docs/redesign/03).
-- Counts non-pageview events by name; visitors counts only sessionized
-- traffic so server-emitted API events never inflate uniques (same policy
-- as the other analytics_* read RPCs).

create or replace function public.analytics_event_breakdown(
    p_site uuid,
    p_from timestamptz,
    p_to timestamptz,
    p_limit int default 50
) returns table (
    name text,
    count bigint,
    visitors bigint
)
language sql stable
security definer
set search_path = public
as $$
    select e.name,
           count(*) as count,
           count(distinct e.visitor_id) filter (where e.session_id is not null) as visitors
    from public.events e
    where e.site_id = p_site
      and e.created_at >= p_from
      and e.created_at < p_to
      and e.name <> 'pageview'
    group by e.name
    order by count desc
    limit p_limit;
$$;

revoke all on function public.analytics_event_breakdown(uuid, timestamptz, timestamptz, int) from public, anon, authenticated;
grant execute on function public.analytics_event_breakdown(uuid, timestamptz, timestamptz, int) to service_role;
