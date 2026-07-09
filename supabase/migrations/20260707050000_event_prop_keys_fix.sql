-- Plan 14 fix: analytics_event_prop_keys passed USING args as
-- (p_site, p_name, p_from, p_to) but the query binds $2/$3 to created_at and $4
-- to name, so $2=p_name gave "timestamp >= text". Reorder to
-- (p_site, p_from, p_to, p_name). Body otherwise identical to 20260707040000.

create or replace function public.analytics_event_prop_keys(
    p_site uuid, p_name text, p_from timestamptz, p_to timestamptz, p_sample int default 50000
) returns table (key text, count bigint)
language plpgsql stable security definer set search_path = public
as $$
declare v_sample int := least(greatest(coalesce(p_sample, 50000), 1), 200000);
begin
    return query execute format($q$
        with sample as (
            select e.props from public.events e
            where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3
              and e.name = $4 and jsonb_typeof(e.props) = 'object'
            order by e.created_at desc limit %s
        )
        select k.key, count(*)::bigint
        from sample s, lateral jsonb_object_keys(s.props) as k(key)
        where k.key <> 'fingerprint'
        group by k.key order by 2 desc limit 60
    $q$, v_sample) using p_site, p_from, p_to, p_name;
end $$;
