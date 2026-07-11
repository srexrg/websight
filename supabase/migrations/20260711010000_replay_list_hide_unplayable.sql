-- Hide zero-value recordings from the Replays list (Rybbit parity: it requires
-- a FullSnapshot + >=2 events before a recording is listed).
--
-- We do not inspect payloads at ingest (they are opaque gzip blobs), so we use
-- two cheap metadata proxies already on replay_recordings:
--   * bytes >= 1024  - a recording that never captured a full snapshot is only
--     a handful of mutation bytes (the historic white-screen bug produced a
--     371-byte recording); a real snapshot gzips to several KB at minimum, so
--     this floor drops the unplayable ones without touching any real recording.
--   * duration_s >= 1 - drops sub-second accidental captures with nothing to watch.
--
-- Same function signature as 20260711000000_replay.sql, so this is a pure body
-- replacement: no getReplays / RPC-arg changes, nothing to coordinate on deploy.
create or replace function public.analytics_replays_list(
    p_site uuid,
    p_from timestamptz,
    p_to timestamptz,
    p_cursor_started timestamptz default null,
    p_cursor_id uuid default null,
    p_limit int default 50,
    p_filters jsonb default '[]'::jsonb
) returns table (
    id uuid,
    session_id uuid,
    visitor_id text,
    user_id text,
    started_at timestamptz,
    duration_s int,
    page_count int,
    chunk_count int,
    bytes bigint,
    entry_path text,
    device_type text,
    browser text,
    os text,
    country text,
    status text,
    is_open boolean
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
        return query
            select r.id, r.session_id, r.visitor_id, s.user_id,
                   r.started_at, r.duration_s, r.page_count, r.chunk_count,
                   r.bytes, r.entry_path, r.device_type, r.browser, r.os,
                   r.country::text, r.status, coalesce(s.is_open, false)
            from public.replay_recordings r
            left join public.sessions s on s.id = r.session_id
            where r.site_id = p_site
              and r.started_at >= p_from and r.started_at < p_to
              and r.bytes >= 1024 and r.duration_s >= 1
              and (p_cursor_started is null
                   or (r.started_at, r.id) < (p_cursor_started, p_cursor_id))
            order by r.started_at desc, r.id desc
            limit v_limit;
        return;
    end if;

    return query execute format($q$
        select r.id, r.session_id, r.visitor_id, s.user_id,
               r.started_at, r.duration_s, r.page_count, r.chunk_count,
               r.bytes, r.entry_path, r.device_type, r.browser, r.os,
               r.country::text, r.status, coalesce(s.is_open, false)
        from public.replay_recordings r
        left join public.sessions s on s.id = r.session_id
        where r.site_id = $1 and r.started_at >= $2 and r.started_at < $3
          and r.bytes >= 1024 and r.duration_s >= 1
          and ($4::timestamptz is null or (r.started_at, r.id) < ($4, $5))
          and r.session_id in (
              select e.session_id from public.events e
              where e.site_id = $1 and e.created_at >= $2 and e.created_at < $3
                and e.session_id is not null and %s
          )
        order by r.started_at desc, r.id desc
        limit $6
    $q$, w) using p_site, p_from, p_to, p_cursor_started, p_cursor_id, v_limit;
end;
$$;
