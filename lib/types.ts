import { Database } from './database.types';

export type PageView = Database['public']['Tables']['page_views']['Row'];
export type Visit = Database['public']['Tables']['visits']['Row'];

export interface GroupedPageView {
  page: string;
  visits: number;
}

export interface GroupedSource {
  source: string;
  visits: number;
}

export interface DeviceStats {
  deviceType: string;
  visits: number;
}

export interface CountryStats {
  country: string;
  visits: number;
}

export interface OsStats {
  os: string;
  visits: number;
}

export interface Event {
  event_name: string;
  message?: string;
  created_at: string;
}

export interface DailyStats {
  domain: string;
  date: string;
  visits: number;
  unique_visitors: number;
  page_views: number;
  total_session_duration?: number;
  completed_sessions?: number;
  bounce_count?: number;
}

export interface TotalStats {
  visits: number;
  unique_visitors: number;
  page_views: number;
  averageSessionDuration: number;
  bounceRate: number;
}

export interface AnalyticsData {
  pageViews: PageView[];
  visits: Visit[];
  dailyStats: DailyStats[];
  deviceStats: DeviceStats[];
  countryStats: CountryStats[];
  osStats: OsStats[];
  events: Event[];
  totalStats: TotalStats;
}