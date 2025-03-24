'use client'

import { useState } from 'react'
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

interface AnalyticsClientProps {
  domain: string;
  initialPageViews: PageView[];
  initialVisits: Visit[];
  initialGroupedPageViews: GroupedPageView[];
  initialGroupedPageSources: GroupedSource[];
}

export function AnalyticsClient({ 
  domain, 
  initialPageViews, 
  initialVisits,
  initialGroupedPageViews,
  initialGroupedPageSources 
}: AnalyticsClientProps) {
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
            pageViews={initialPageViews.length}
            totalVisits={initialVisits.length}
          />
        </TabsContent>

        <TabsContent value="pages" className="mt-6">
          <PageAnalytics
            groupedPageViews={initialGroupedPageViews}
            groupedPageSources={initialGroupedPageSources}
            totalVisits={initialVisits.length}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}