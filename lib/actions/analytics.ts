"use server"
import { DailyStats, AnalyticsData } from "../types";

export async function fetchEnhancedAnalytics(supabaseClient: any, domain: string): Promise<AnalyticsData> {
  const [
    pageViewsResponse,
    visitsResponse,
    dailyStatsResponse,
    eventsResponse,
    deviceStatsPromise,
    countryStatsPromise,
    osStatsPromise,
  ] = await Promise.all([
    supabaseClient.from("page_views").select("*").eq("domain", domain),
    supabaseClient.from("visits")
      .select("*")
      .eq("website_id", domain)
      .not("duration", "is", null), // Only completed sessions
    supabaseClient.from("daily_stats")
      .select("*")
      .eq("domain", domain)
      .order('date', { ascending: false })
      .limit(30),
    supabaseClient
      .from("events")
      .select('*')
      .eq("website_id", domain),
    supabaseClient.rpc('get_device_stats', { website_domain: domain }),
    supabaseClient.rpc('get_country_stats', { website_domain: domain }),
    supabaseClient.rpc('get_os_stats', { website_domain: domain })
  ]);

  // Calculate average session duration
  const completedSessions = visitsResponse.data.filter((visit: any) => visit.duration !== null);
  const totalDuration = completedSessions.reduce((acc: number, visit: any) => acc + (visit.duration || 0), 0);
  const averageSessionDuration = completedSessions.length > 0 ? totalDuration / completedSessions.length : 0;

  // Calculate bounce rate
  const totalSessions = visitsResponse.data.length;
  const bouncedSessions = visitsResponse.data.filter((visit: any) => visit.is_bounce).length;
  const bounceRate = totalSessions > 0 ? (bouncedSessions / totalSessions) * 100 : 0;

  // Get total stats for the most recent day
  const latestStats = dailyStatsResponse.data?.[0] || {
    visits: 0,
    unique_visitors: 0,
    page_views: 0
  };

  return {
    pageViews: pageViewsResponse.data || [],
    visits: visitsResponse.data || [],
    dailyStats: (dailyStatsResponse.data || []) as DailyStats[],
    deviceStats: deviceStatsPromise.data?.map((d: any) => ({
      deviceType: d.device_type || 'unknown',
      visits: parseInt(d.count)
    })) || [],
    countryStats: countryStatsPromise.data?.map((c: any) => ({
      country: c.country || 'unknown',
      visits: parseInt(c.count)
    })) || [],
    osStats: osStatsPromise.data?.map((o: any) => ({
      os: o.os || 'unknown',
      visits: parseInt(o.count)
    })) || [],
    events: eventsResponse.data || [],
    totalStats: {
      visits: latestStats.visits,
      unique_visitors: latestStats.unique_visitors,
      page_views: latestStats.page_views,
      averageSessionDuration,
      bounceRate
    }
  };
}