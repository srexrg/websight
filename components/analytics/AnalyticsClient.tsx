'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AnalyticsOverview } from './AnalyticsOverview'
import { PageAnalytics } from './PageAnalytics'
import { Database } from '@/lib/database.types'
import { CustomEventsAnalytics } from "./CustomEventsAnalytics"
import { motion } from "framer-motion"

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
  totalStats,
  initialDailyStats
}: AnalyticsClientProps) {

  const totalPageViews = totalStats.page_views;
  const totalVisitors = totalStats.unique_visitors;
  const totalVisits = totalStats.visits;

  if (initialPageViews.length === 0) {
    return (
      <motion.div 
        className="flex flex-col items-center justify-center py-20 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-16 h-16 mb-6 rounded-2xl bg-violet-600/10 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-violet-500"
          >
            <path d="M3 3v18h18" />
            <path d="m19 9-5 5-4-4-3 3" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No analytics data yet</h3>
        <p className="max-w-md text-gray-400">
          We're waiting for the first page view. Make sure you've added the tracking
          script to your website.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-zinc-900/40 border border-zinc-800 p-1">
          <TabsTrigger 
            value="overview"
            className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-zinc-400 hover:text-white transition-colors"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="pages"
            className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-zinc-400 hover:text-white transition-colors"
          >
            Pages & Sources
          </TabsTrigger>
          <TabsTrigger 
            value="events"
            className="data-[state=active]:bg-violet-600 data-[state=active]:text-white text-zinc-400 hover:text-white transition-colors"
          >
            Events
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <AnalyticsOverview
            pageViews={totalPageViews}
            totalVisits={totalVisits}
            uniqueVisitors={totalVisitors}
            deviceStats={deviceStats}
            countryStats={countryStats}
            osStats={osStats}
            dailyStats={initialDailyStats}
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
    </motion.div>
  );
}