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

export interface DeviceStat {
  deviceType: string;
  visits: number;
}

export interface CountryStat {
  country: string;
  visits: number;
}

export interface OsStat {
  os: string;
  visits: number;
}

export interface Event {
  event_name: string;
  message?: string;
  created_at: string;
}

export interface DailyStats {
  date: string;
  visits: number;
  unique_visitors: number;
  page_views: number;
}

export interface TotalStats {
  visits: number;
  unique_visitors: number;
  page_views: number;
}

export interface AnalyticsData {
  pageViews: PageView[];
  visits: Visit[];
  dailyStats: DailyStats[];
  deviceStats: DeviceStat[];
  countryStats: CountryStat[];
  osStats: OsStat[];
  events: Event[];

}