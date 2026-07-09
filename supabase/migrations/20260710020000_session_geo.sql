-- Exact placement for the live globe: stamp a session's city-level coordinates
-- (from CDN geo headers) so avatars land at the real location instead of the
-- country centroid.
--
-- Done via a tiny helper called from the track route AFTER ingest_event, rather
-- than editing the large ingest_event function - lower risk, and the globe only
-- reads sessions.lat/lng anyway. Only stamps the open session, and only once
-- (lat is null), so a visitor keeps their first-seen location for the session.

create or replace function public.ingest_session_geo(
    p_site uuid,
    p_visitor text,
    p_lat real,
    p_lng real
) returns void
language sql
security definer
set search_path = public
as $$
    update public.sessions
       set lat = p_lat, lng = p_lng
     where site_id = p_site
       and visitor_id = p_visitor
       and is_open
       and lat is null;
$$;

revoke all on function public.ingest_session_geo(uuid, text, real, real) from public, anon, authenticated;
grant execute on function public.ingest_session_geo(uuid, text, real, real) to service_role;
