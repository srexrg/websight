-- Plan 13: Error tracking.
-- error events (name='error', props {message,type,stack,filename,line,col,
-- external}) are fingerprinted at ingest by a BEFORE-insert trigger that writes
-- the fingerprint back onto the event props and maintains an error_groups row
-- (counts, first/last seen, triage status). The trigger is exception-safe so
-- grouping can never break ingestion, and rate-caps a runaway group per minute.

create table if not exists public.error_groups (
    id uuid primary key default gen_random_uuid(),
    site_id uuid not null references public.sites(id) on delete cascade,
    fingerprint text not null,
    message text,
    type text,
    first_seen timestamptz not null default now(),
    last_seen timestamptz not null default now(),
    occurrences bigint not null default 0,
    status text not null default 'open' check (status in ('open', 'resolved', 'ignored')),
    resolved_at timestamptz,
    is_external boolean not null default false,
    regressed boolean not null default false,   -- resolved group that recurred
    dropped bigint not null default 0,           -- rate-limited occurrences
    minute_bucket timestamptz,
    minute_count int not null default 0,
    unique (site_id, fingerprint)
);
alter table public.error_groups enable row level security;  -- service_role RPCs + owner routes only
create index if not exists error_groups_site_idx on public.error_groups (site_id, last_seen desc);
create index if not exists events_error_fp_idx
    on public.events (site_id, ((props->>'fingerprint')))
    where name = 'error';

-- Stable fingerprint: normalized message + top ~3 script stack frames with
-- volatile bits (numbers, UUIDs, URLs, content hashes, line:col) stripped, so
-- the same bug groups across visitors and across bundle-hash-changing deploys.
create or replace function public._error_fingerprint(p_message text, p_stack text)
returns text
language plpgsql
immutable
as $$
declare
    m text;
    f text := '';
    ln text;
    cnt int := 0;
begin
    m := lower(coalesce(p_message, ''));
    m := regexp_replace(m, 'https?://[^\s]+', 'url', 'g');
    m := regexp_replace(m, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'uuid', 'g');
    m := regexp_replace(m, '0x[0-9a-f]+', 'hex', 'g');
    m := regexp_replace(m, '\d+', 'n', 'g');
    m := btrim(regexp_replace(m, '\s+', ' ', 'g'));

    foreach ln in array regexp_split_to_array(coalesce(p_stack, ''), E'\n') loop
        if ln ~ '\.(js|ts|mjs|cjs|jsx|tsx)' then
            ln := regexp_replace(ln, 'https?://[^\s/]+', '', 'g');   -- host
            ln := regexp_replace(ln, '[?#][^\s):]*', '', 'g');       -- query/hash
            ln := regexp_replace(ln, '\.[0-9a-f]{6,}\.', '.', 'g');  -- content hash
            ln := regexp_replace(ln, ':\d+:\d+', '', 'g');           -- line:col
            ln := regexp_replace(ln, '\d+', 'n', 'g');
            f := f || '|' || btrim(ln);
            cnt := cnt + 1;
            exit when cnt >= 3;
        end if;
    end loop;

    return md5(m || f);
end $$;

-- BEFORE-insert on events: fingerprint error rows, maintain the group, rate-cap.
create or replace function public.errors_capture()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    fp text;
    ext boolean;
    minute timestamptz := date_trunc('minute', now());
    cap int := 120;   -- per group per minute
    cur record;
begin
    if new.name <> 'error' then
        return new;
    end if;
    begin
        fp := public._error_fingerprint(new.props->>'message', new.props->>'stack');
        ext := coalesce((new.props->>'external')::boolean, false);
        new.props := coalesce(new.props, '{}'::jsonb) || jsonb_build_object('fingerprint', fp);

        select minute_bucket, minute_count into cur
        from public.error_groups where site_id = new.site_id and fingerprint = fp;

        if found and cur.minute_bucket = minute and cur.minute_count >= cap then
            update public.error_groups set dropped = dropped + 1
            where site_id = new.site_id and fingerprint = fp;
            return null;  -- rate-limited: drop this occurrence
        end if;

        insert into public.error_groups
            (site_id, fingerprint, message, type, is_external, first_seen, last_seen, occurrences, minute_bucket, minute_count)
        values
            (new.site_id, fp, left(coalesce(new.props->>'message', ''), 500),
             left(coalesce(new.props->>'type', ''), 60), ext, now(), now(), 1, minute, 1)
        on conflict (site_id, fingerprint) do update set
            occurrences = public.error_groups.occurrences + 1,
            last_seen = excluded.last_seen,
            message = excluded.message,
            type = excluded.type,
            is_external = excluded.is_external,
            minute_count = case when public.error_groups.minute_bucket = excluded.minute_bucket
                                then public.error_groups.minute_count + 1 else 1 end,
            minute_bucket = excluded.minute_bucket,
            regressed = case when public.error_groups.status = 'resolved' then true else public.error_groups.regressed end,
            status = case when public.error_groups.status = 'resolved' then 'open' else public.error_groups.status end;
    exception when others then
        null;  -- grouping must never break ingestion
    end;
    return new;
end $$;

drop trigger if exists events_errors_capture on public.events;
create trigger events_errors_capture
    before insert on public.events
    for each row execute function public.errors_capture();

-- ------------------------------------------------------------------ read RPCs

-- Grouped list: range-scoped occurrences/visitors joined to group metadata.
create or replace function public.analytics_error_groups(
    p_site uuid,
    p_from timestamptz,
    p_to timestamptz,
    p_status text default null,
    p_filters jsonb default '[]'::jsonb,
    p_limit int default 50
) returns table (
    id uuid, fingerprint text, message text, type text, status text,
    is_external boolean, regressed boolean, dropped bigint,
    first_seen timestamptz, last_seen timestamptz,
    occurrences bigint, visitors bigint, top_browser text
)
language plpgsql stable security definer set search_path = public
as $$
declare
    w text := public._analytics_where(p_filters);
    v_limit int := least(greatest(coalesce(p_limit, 50), 1), 200);
begin
    return query execute format($q$
        with occ as (
            select e.props->>'fingerprint' as fp,
                   count(*)::bigint as occ,
                   count(distinct e.visitor_id)::bigint as vis,
                   max(e.created_at) as last_seen,
                   mode() within group (order by e.browser) as top_browser
            from public.events e
            where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3
              and e.name = 'error' and e.props->>'fingerprint' is not null and (%s)
            group by 1
        )
        select g.id, g.fingerprint, g.message, g.type, g.status,
               g.is_external, g.regressed, g.dropped,
               g.first_seen, o.last_seen, o.occ, o.vis, o.top_browser
        from occ o
        join public.error_groups g on g.site_id = $1 and g.fingerprint = o.fp
        where ($4 is null or g.status = $4)
        order by o.last_seen desc
        limit %s
    $q$, w, v_limit) using p_site, p_from, p_to, p_status;
end $$;

-- Range occurrence + visitor totals for one group (detail header).
create or replace function public.analytics_error_group_stats(
    p_site uuid, p_group uuid, p_from timestamptz, p_to timestamptz, p_filters jsonb default '[]'::jsonb
) returns table (occurrences bigint, visitors bigint)
language plpgsql stable security definer set search_path = public
as $$
declare
    w text := public._analytics_where(p_filters);
    fp text;
begin
    select fingerprint into fp from public.error_groups where id = p_group and site_id = p_site;
    if fp is null then return; end if;
    return query execute format($q$
        select count(*)::bigint, count(distinct e.visitor_id)::bigint
        from public.events e
        where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3
          and e.name = 'error' and e.props->>'fingerprint' = $4 and (%s)
    $q$, w) using p_site, p_from, p_to, fp;
end $$;

-- Occurrences over time for one group.
create or replace function public.analytics_error_timeseries(
    p_site uuid, p_group uuid, p_from timestamptz, p_to timestamptz,
    p_granularity text default 'day', p_filters jsonb default '[]'::jsonb
) returns table (bucket timestamptz, count bigint)
language plpgsql stable security definer set search_path = public
as $$
declare
    w text := public._analytics_where(p_filters);
    g text := case when p_granularity in ('hour','day','week','month') then p_granularity else 'day' end;
    fp text;
begin
    select fingerprint into fp from public.error_groups where id = p_group and site_id = p_site;
    if fp is null then return; end if;
    return query execute format($q$
        select date_trunc(%L, e.created_at), count(*)::bigint
        from public.events e
        where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3
          and e.name = 'error' and e.props->>'fingerprint' = $4 and (%s)
        group by 1 order by 1
    $q$, g, w) using p_site, p_from, p_to, fp;
end $$;

-- One-dimension breakdown for a group (path/browser/os/country).
create or replace function public.analytics_error_breakdown(
    p_site uuid, p_group uuid, p_from timestamptz, p_to timestamptz,
    p_dimension text, p_filters jsonb default '[]'::jsonb, p_limit int default 8
) returns table (value text, count bigint)
language plpgsql stable security definer set search_path = public
as $$
declare
    w text := public._analytics_where(p_filters);
    col text;
    fp text;
    v_limit int := least(greatest(coalesce(p_limit, 8), 1), 50);
begin
    if p_dimension not in ('path','browser','os','country','device_type') then
        raise exception 'invalid error dimension %', p_dimension;
    end if;
    select fingerprint into fp from public.error_groups where id = p_group and site_id = p_site;
    if fp is null then return; end if;
    col := format('e.%I', p_dimension);
    return query execute format($q$
        select coalesce(%s::text, '(none)'), count(*)::bigint
        from public.events e
        where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3
          and e.name = 'error' and e.props->>'fingerprint' = $4 and (%s)
        group by 1 order by 2 desc limit %s
    $q$, col, w, v_limit) using p_site, p_from, p_to, fp;
end $$;

-- Recent sample occurrences for a group, linking to their session.
create or replace function public.analytics_error_occurrences(
    p_site uuid, p_group uuid, p_from timestamptz, p_to timestamptz,
    p_filters jsonb default '[]'::jsonb, p_limit int default 20
) returns table (
    created_at timestamptz, session_id uuid, visitor_id text,
    path text, browser text, os text, country text, message text, stack text
)
language plpgsql stable security definer set search_path = public
as $$
declare
    w text := public._analytics_where(p_filters);
    fp text;
    v_limit int := least(greatest(coalesce(p_limit, 20), 1), 100);
begin
    select fingerprint into fp from public.error_groups where id = p_group and site_id = p_site;
    if fp is null then return; end if;
    return query execute format($q$
        select e.created_at, e.session_id, e.visitor_id, e.path, e.browser, e.os,
               e.country::text, e.props->>'message', e.props->>'stack'
        from public.events e
        where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3
          and e.name = 'error' and e.props->>'fingerprint' = $4 and (%s)
        order by e.created_at desc limit %s
    $q$, w, v_limit) using p_site, p_from, p_to, fp;
end $$;

revoke all on function public._error_fingerprint(text, text) from public, anon, authenticated;
revoke all on function public.analytics_error_groups(uuid, timestamptz, timestamptz, text, jsonb, int) from public, anon, authenticated;
revoke all on function public.analytics_error_group_stats(uuid, uuid, timestamptz, timestamptz, jsonb) from public, anon, authenticated;
revoke all on function public.analytics_error_timeseries(uuid, uuid, timestamptz, timestamptz, text, jsonb) from public, anon, authenticated;
revoke all on function public.analytics_error_breakdown(uuid, uuid, timestamptz, timestamptz, text, jsonb, int) from public, anon, authenticated;
revoke all on function public.analytics_error_occurrences(uuid, uuid, timestamptz, timestamptz, jsonb, int) from public, anon, authenticated;
grant execute on function public.analytics_error_groups(uuid, timestamptz, timestamptz, text, jsonb, int) to service_role;
grant execute on function public.analytics_error_group_stats(uuid, uuid, timestamptz, timestamptz, jsonb) to service_role;
grant execute on function public.analytics_error_timeseries(uuid, uuid, timestamptz, timestamptz, text, jsonb) to service_role;
grant execute on function public.analytics_error_breakdown(uuid, uuid, timestamptz, timestamptz, text, jsonb, int) to service_role;
grant execute on function public.analytics_error_occurrences(uuid, uuid, timestamptz, timestamptz, jsonb, int) to service_role;
