-- Plan 09 milestone 4: funnel time-to-convert distribution.
-- For visitors who completed the whole funnel, bucket the elapsed time from
-- step 1 to the last step. Fixed buckets keep the payload tiny.

create or replace function public.analytics_funnel_ttc(
    p_site uuid,
    p_from timestamptz,
    p_to timestamptz,
    p_steps jsonb,
    p_window_minutes int,
    p_filters jsonb default '[]'::jsonb
) returns table (bucket int, count bigint)
language plpgsql stable
security definer
set search_path = public
as $$
declare
    n int := jsonb_array_length(p_steps);
    base text := public._funnel_base_sql(p_steps, public._analytics_where(p_filters));
    q text;
begin
    -- bucket: 0 <1m, 1 1-5m, 2 5-30m, 3 30-60m, 4 1-6h, 5 6-24h, 6 >1d
    q := format($f$
        with d as (
            select extract(epoch from (sub.t%1$s - sub.t1)) as secs
            from (%2$s) sub
            where sub.t%1$s is not null
        )
        select case
                   when secs < 60 then 0
                   when secs < 300 then 1
                   when secs < 1800 then 2
                   when secs < 3600 then 3
                   when secs < 21600 then 4
                   when secs < 86400 then 5
                   else 6
               end as bucket,
               count(*)::bigint
        from d
        group by 1
        order by 1
    $f$, n, base);
    return query execute q using p_site, p_from, p_to, p_window_minutes;
end;
$$;

revoke all on function public.analytics_funnel_ttc(uuid, timestamptz, timestamptz, jsonb, int, jsonb) from public, anon, authenticated;
grant execute on function public.analytics_funnel_ttc(uuid, timestamptz, timestamptz, jsonb, int, jsonb) to service_role;
