'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowBigDownDashIcon } from "lucide-react"
import { AnalyticsOverview } from './AnalyticsOverview'
import { PageAnalytics } from './PageAnalytics'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
}

export function AnalyticsClient({ domain }: AnalyticsClientProps) {
  const [pageViews, setPageViews] = useState<PageView[]>([]);
  const [totalVisits, setTotalVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupedPageViews, setGroupedPageViews] = useState<GroupedPageView[]>([]);
  const [groupedPageSources, setGroupedPageSources] = useState<GroupedSource[]>([]);
  const [filterValue, setFilterValue] = useState<number>(0);
  const supabase = createClient();

  const fetchAnalytics = async (filter_duration?: string) => {
    setLoading(true);
    const ThatTimeAgo = new Date();
    
    if (filter_duration) {
      const match = filter_duration.match(/\d+/);
      const onlyNumber_filter_duration = match ? parseInt(match[0]) : 0;
      ThatTimeAgo.setDate(ThatTimeAgo.getDate() - onlyNumber_filter_duration);
    }

    try {
      const [viewsResponse, visitsResponse] = filter_duration
        ? await Promise.all([
            supabase
              .from("page_views")
              .select()
              .eq("domain", domain)
              .filter("created_at", "gte", ThatTimeAgo.toISOString()),
            supabase
              .from("visits")
              .select()
              .eq("website_id", domain)
              .filter("created_at", "gte", ThatTimeAgo.toISOString()),
          ])
        : await Promise.all([
            supabase.from("page_views").select().eq("domain", domain),
            supabase.from("visits").select().eq("website_id", domain),
          ]);

      const views = viewsResponse.data || [];
      const visits = visitsResponse.data || [];

      setPageViews(views);
      setGroupedPageViews(groupPageViews(views));
      setTotalVisits(visits);
      setGroupedPageSources(groupPageSources(visits));
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  function groupPageViews(pageViews: PageView[]): GroupedPageView[] {
    const groupedViews: Record<string, number> = {};
    pageViews.forEach(({ page }) => {
      if (page) {
        const path = page.replace(/^(?:\/\/|[^\/]+)*\/?/, "");
        groupedViews[path] = (groupedViews[path] || 0) + 1;
      }
    });

    return Object.entries(groupedViews)
      .map(([page, visits]) => ({ page, visits }))
      .sort((a, b) => b.visits - a.visits);
  }

  function groupPageSources(visits: Visit[]): GroupedSource[] {
    const groupedSources: Record<string, number> = {};
    visits.forEach(({ source }) => {
      if (source) {
        groupedSources[source] = (groupedSources[source] || 0) + 1;
      }
    });

    return Object.entries(groupedSources)
      .map(([source, visits]) => ({ source, visits }))
      .sort((a, b) => b.visits - a.visits);
  }

  useEffect(() => {
    if (!domain) return;
    fetchAnalytics();
    

    const interval = setInterval(() => {
      fetchAnalytics();
    }, 30000);

    return () => clearInterval(interval);
  }, [domain]);

  if (loading && pageViews.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center text-muted-foreground">
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!loading && pageViews.length === 0) {
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
      <div className="flex justify-end px-4">
        <Select
          value={filterValue.toString()}
          onValueChange={(value) => {
            setFilterValue(parseInt(value));
            fetchAnalytics(value === "0" ? undefined : `last ${value} days`);
          }}
        >
          <SelectTrigger className="w-[180px] border border-white/5 outline-none hover:border-white/20">
            <SelectValue placeholder="Filter period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Lifetime</SelectItem>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
        <button
          onClick={() => fetchAnalytics(filterValue === 0 ? undefined : `last ${filterValue} days`)}
          className="ml-2 p-2 hover:bg-white/5 rounded-md"
        >
          <ArrowBigDownDashIcon className="h-4 w-4" />
        </button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pages">Pages & Sources</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <AnalyticsOverview
            pageViews={pageViews.length}
            totalVisits={totalVisits.length}
          />
        </TabsContent>

        <TabsContent value="pages" className="mt-6">
          <PageAnalytics
            groupedPageViews={groupedPageViews}
            groupedPageSources={groupedPageSources}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}