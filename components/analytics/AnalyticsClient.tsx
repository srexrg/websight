'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AnalyticsOverview } from './AnalyticsOverview'
import { PageAnalytics } from './PageAnalytics'
import { Database } from '@/lib/database.types'
import { CustomEventsAnalytics } from "./CustomEventsAnalytics"

type PageView = Database['public']['Tables']['page_views']['Row']
type Visit = Database['public']['Tables']['visits']['Row']

interface TrackedEvent {
  event_name: string
  message?: string
  created_at: string
}

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
  averageSessionDuration: number;
  bounceRate: number;
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
  events: TrackedEvent[];
}

export function AnalyticsClient({ 
  initialPageViews, 
  initialGroupedPageViews,
  initialGroupedPageSources,
  deviceStats,
  countryStats,
  osStats,
  events,
  totalStats
}: AnalyticsClientProps) {

  const totalPageViews = totalStats.page_views;
  const totalVisitors = totalStats.unique_visitors;
  const totalVisits = totalStats.visits;
  const averageSessionDuration = totalStats.averageSessionDuration;
  const bounceRate = totalStats.bounceRate;

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
    <div>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <AnalyticsOverview
            pageViews={totalPageViews}
            totalVisits={totalVisits}
            uniqueVisitors={totalVisitors}
            averageSessionDuration={averageSessionDuration}
            bounceRate={bounceRate}
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
        <TabsContent value="events" className="mt-6">
          <CustomEventsAnalytics events={events} />
        </TabsContent>
      </Tabs>
    </div>
  );
}