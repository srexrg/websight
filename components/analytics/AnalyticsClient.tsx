'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AnalyticsOverview } from './AnalyticsOverview'
import { PageAnalytics } from './PageAnalytics'
import { Database } from '@/lib/database.types'

type PageView = Database['public']['Tables']['page_views']['Row']
type Visit = Database['public']['Tables']['visits']['Row']

interface GroupedPageView {
  page: string;
  visits: number;
}

interface GroupedSource {
  source: string;
  visits: number;
}

interface DeviceStats {
  deviceType: string;
  visits: number;
}

interface CountryStats {
  country: string;
  visits: number;
}

interface OsStats {
  os: string;
  visits: number;
}

interface DailyStat {
  date: string;
  visits: number;
  unique_visitors: number;
  page_views: number;
}

interface TotalStats {
  visits: number;
  unique_visitors: number;
  page_views: number;
}

interface AnalyticsClientProps {
  domain: string;
  initialPageViews: PageView[];
  initialVisits: Visit[];
  initialGroupedPageViews: GroupedPageView[];
  initialGroupedPageSources: GroupedSource[];
  initialDailyStats: DailyStat[];
  deviceStats: DeviceStats[];
  countryStats: CountryStats[];
  osStats: OsStats[];
  totalStats: TotalStats;
}

export function AnalyticsClient({ 
  initialPageViews, 
  initialVisits,
  initialGroupedPageViews,
  initialGroupedPageSources,
  initialDailyStats,
  deviceStats,
  countryStats,
  osStats,
  totalStats
}: AnalyticsClientProps) {
  // Calculate total visitors and page views from daily stats
  const totalPageViews = totalStats.page_views;
  const totalVisitors = totalStats.unique_visitors;
  const totalVisits = totalStats.visits;

  // Calculate average session duration (if you have session duration data)
  // For now we'll leave it undefined
  const averageSessionDuration = undefined;

  if (initialPageViews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mb-4 opacity-50"
        >
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
        </svg>
        <p className="text-lg mb-2">No analytics data yet</p>
        <p className="max-w-md">
          We're waiting for the first page view. Make sure you've added the tracking
          script to your website.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pages">Pages & Sources</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <AnalyticsOverview
            pageViews={totalPageViews}
            totalVisits={totalVisits}
            uniqueVisitors={totalVisitors}
            averageSessionDuration={averageSessionDuration}
            deviceStats={deviceStats}
            countryStats={countryStats}
            osStats={osStats}
          />
        </TabsContent>

        <TabsContent value="pages" className="mt-6">
          <PageAnalytics
            groupedPageViews={initialGroupedPageViews}
            groupedPageSources={initialGroupedPageSources}
            totalVisits={totalVisits}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}