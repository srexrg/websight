"use server"
import { DailyStats, AnalyticsData } from "../../lib/types";

export async function fetchEnhancedAnalytics(supabaseClient: any, domain: string): Promise<AnalyticsData> {
  const [
    pageViewsResponse,
    visitsResponse,
    dailyStatsResponse,
    deviceStatsPromise,
    countryStatsPromise,
    osStatsPromise
  ] = await Promise.all([
    supabaseClient.from("page_views").select("*").eq("domain", domain),
    supabaseClient.from("visits").select("*").eq("website_id", domain),
    supabaseClient.from("daily_stats")
      .select("*")
      .eq("domain", domain)
      .order('date', { ascending: false })
      .limit(30),
    supabaseClient.rpc('get_device_stats', { website_domain: domain }),
    supabaseClient.rpc('get_country_stats', { website_domain: domain }),
    supabaseClient.rpc('get_os_stats', { website_domain: domain })
  ]);

  // Rest of your code remains the same
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
    })) || []
  };
}