"use server"
import { SupabaseClient } from "@supabase/supabase-js";
import { DailyStats, AnalyticsData } from "../types";

export type TimeRange = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'last90days';

function getDateRange(timeRange: TimeRange) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (timeRange) {
    case 'today':
      return {
        start: today,
        end: new Date(now.getTime()) 
      };
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        start: yesterday,
        end: today 
      };
    case 'last7days':
      const last7Days = new Date(today);
      last7Days.setDate(last7Days.getDate() - 7);
      return {
        start: last7Days,
        end: new Date(now.getTime())
      };
    case 'last30days':
      const last30Days = new Date(today);
      last30Days.setDate(last30Days.getDate() - 30);
      return {
        start: last30Days,
        end: new Date(now.getTime()) 
      };
    case 'last90days':
      const last90Days = new Date(today);
      last90Days.setDate(last90Days.getDate() - 90);
      return {
        start: last90Days,
        end: new Date(now.getTime()) 
      };
    default:
      return {
        start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(now.getTime()) 
      };
  }
}

export async function fetchEnhancedAnalytics(
  supabaseClient: SupabaseClient, 
  domain: string,
  timeRange: TimeRange = 'today'
): Promise<AnalyticsData> {
  const dateRange = getDateRange(timeRange);
  
  const [
    pageViewsResponse,
    visitsResponse,
    dailyStatsResponse,
    eventsResponse,
    deviceStatsPromise,
    countryStatsPromise,
    osStatsPromise,
  ] = await Promise.all([
    supabaseClient
      .from("page_views")
      .select("*")
      .eq("domain", domain)
      .gte("created_at", dateRange.start.toISOString())
      .lte("created_at", dateRange.end.toISOString()),
    supabaseClient
      .from("visits")
      .select("*")
      .eq("website_id", domain)
      .gte("created_at", dateRange.start.toISOString())
      .lte("created_at", dateRange.end.toISOString()),
    supabaseClient
      .from("daily_stats")
      .select("*")
      .eq("domain", domain)
      .gte("date", dateRange.start.toISOString().split('T')[0])
      .lte("date", dateRange.end.toISOString().split('T')[0])
      .order('date', { ascending: true }),
    supabaseClient
      .from("events")
      .select('*')
      .eq("website_id", domain)
      .gte("created_at", dateRange.start.toISOString())
      .lte("created_at", dateRange.end.toISOString()),
    supabaseClient.rpc('get_device_stats', { 
      website_domain: domain,
      start_date: dateRange.start.toISOString(),
      end_date: dateRange.end.toISOString()
    }),
    supabaseClient.rpc('get_country_stats', { 
      website_domain: domain,
      start_date: dateRange.start.toISOString(),
      end_date: dateRange.end.toISOString()
    }),
    supabaseClient.rpc('get_os_stats', { 
      website_domain: domain,
      start_date: dateRange.start.toISOString(),
      end_date: dateRange.end.toISOString()
    })
  ]);

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
    events: eventsResponse.data || []
  };
}