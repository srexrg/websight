'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AnalyticsOverview } from './AnalyticsOverview'
import { PageAnalytics } from './PageAnalytics'
import { Database } from '@/lib/database.types'
import { CustomEventsAnalytics } from "./CustomEventsAnalytics"
import { motion } from "framer-motion"
import { TimeRange } from '@/lib/actions/analytics'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CalendarIcon, ChevronDownIcon, BarChart3, FileText, Bell } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState, useEffect } from 'react'
import { DailyStat, GroupedPageView, GroupedSource, DeviceStats, CountryStats, OsStats, TotalStats, TrackedEvent } from "@/lib/types"

type PageView = Database['public']['Tables']['page_views']['Row']
type Visit = Database['public']['Tables']['visits']['Row']






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
  timeRange: TimeRange;
}

function getRangeLabel(range: TimeRange) {
  switch (range) {
    case 'today':
      return 'Today'
    case 'yesterday':
      return 'Yesterday'
    case 'last7days':
      return 'Last 7 days'
    case 'last30days':
      return 'Last 30 days'
    case 'last90days':
      return 'Last 90 days'
    default:
      return 'Last 30 days'
  }
}

// Add a loading skeleton component
function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-end">
        <div className="h-10 w-40 bg-zinc-800 rounded-md"></div>
      </div>
      
      <div className="bg-zinc-900/40 border border-zinc-800 p-1 rounded-md h-10"></div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-6 h-32"></div>
        ))}
      </div>
      
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-6 h-80"></div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-6 h-64"></div>
        ))}
      </div>
    </div>
  );
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
  initialDailyStats,
  timeRange: initialTimeRange,
}: AnalyticsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTimeRange = searchParams.get('timeRange') as TimeRange || initialTimeRange;
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Reset loading state when data changes
  useEffect(() => {
    setIsLoading(false);
  }, [initialPageViews, initialDailyStats, initialGroupedPageViews, initialGroupedPageSources]);

  const handleTimeRangeChange = (range: TimeRange) => {
    setIsLoading(true);
    const params = new URLSearchParams(searchParams.toString());
    params.set('timeRange', range);
    router.push(`?${params.toString()}`);
  };

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
        <div className="w-16 h-16 mb-6 rounded-2xl bg-blue-600/10 flex items-center justify-center">
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
            className="text-blue-500"
          >
            <path d="M3 3v18h18" />
            <path d="m19 9-5 5-4-4-3 3" />
          </svg>
        </div>
        <h3 className="text-xl text-white mb-2 font-oswald">No analytics data yet</h3>
        <p className="max-w-md text-gray-400 font-jakarta">
          We&apos;re waiting for the first page view. Make sure you&apos;ve added the tracking
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
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="bg-zinc-900/80 hover:bg-zinc-800/90 text-gray-300 hover:text-white border-zinc-700 hover:border-blue-500/50 transition-all duration-300"
              disabled={isLoading}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {getRangeLabel(currentTimeRange)}
              <ChevronDownIcon className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-zinc-950 border-zinc-800"
          >
            <DropdownMenuItem
              onClick={() => handleTimeRangeChange("today")}
              className="text-gray-300 hover:text-white hover:bg-zinc-800 cursor-pointer"
            >
              Today
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleTimeRangeChange("yesterday")}
              className="text-gray-300 hover:text-white hover:bg-zinc-800 cursor-pointer"
            >
              Yesterday
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleTimeRangeChange("last7days")}
              className="text-gray-300 hover:text-white hover:bg-zinc-800 cursor-pointer"
            >
              Last 7 days
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleTimeRangeChange("last30days")}
              className="text-gray-300 hover:text-white hover:bg-zinc-800 cursor-pointer"
            >
              Last 30 days
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleTimeRangeChange("last90days")}
              className="text-gray-300 hover:text-white hover:bg-zinc-800 cursor-pointer"
            >
              Last 90 days
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isLoading ? (
        <AnalyticsSkeleton />
      ) : (
        <Tabs
          defaultValue="overview"
          className="w-full"
          onValueChange={setActiveTab}
        >
          <div className="relative mb-6">
            <TabsList className="bg-zinc-900/40 border border-zinc-800 p-1 rounded-lg w-full flex justify-between font-jakarta">
              <TabsTrigger
                value="overview"
                className="flex-1 cursor-pointer data-[state=active]:bg-blue-600/20 data-[state=active]:text-white text-zinc-400 hover:text-white transition-all duration-300 rounded-md py-2 px-4 flex items-center justify-center gap-2 relative"
              >
                <BarChart3 className="h-4 w-4" />
                <span>Overview</span>
                {activeTab === "overview" && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full"
                    layoutId="activeTabIndicator"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </TabsTrigger>
              <TabsTrigger
                value="pages"
                className="flex-1 cursor-pointer data-[state=active]:bg-blue-600/20 data-[state=active]:text-white text-zinc-400 hover:text-white transition-all duration-300 rounded-md py-2 px-4 flex items-center justify-center gap-2 relative"
              >
                <FileText className="h-4 w-4" />
                <span>Pages & Sources</span>
                {activeTab === "pages" && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full"
                    layoutId="activeTabIndicator"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </TabsTrigger>
              <TabsTrigger
                value="events"
                className="flex-1 cursor-pointer data-[state=active]:bg-blue-600/20 data-[state=active]:text-white text-zinc-400 hover:text-white transition-all duration-300 rounded-md py-2 px-4 flex items-center justify-center gap-2 relative"
              >
                <Bell className="h-4 w-4" />
                <span>Events</span>
                {activeTab === "events" && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full"
                    layoutId="activeTabIndicator"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </TabsTrigger>
            </TabsList>
          </div>

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
      )}
    </motion.div>
  );
}