import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/ui/header";
import { AnalyticsClient } from "@/components/analytics/AnalyticsClient";
import { ExportButton } from "@/components/analytics/ExportButton";
import { TrackingScript } from "@/components/analytics/TrackingScript";
import { fetchEnhancedAnalytics, TimeRange } from "@/lib/actions/analytics";
import {
  GroupedPageView,
  GroupedSource,
  DailyStats,
  PageView,
  Visit,
} from "@/lib/types";

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

export const metadata = {
  title: {
    template: "%s Analytics",
  },
};

export type paramsType = Promise<{ domain: string }>;

interface PageProps {
  params: paramsType;
  searchParams: Promise<{ timeRange?: TimeRange }>;
}

export default async function WebsiteDetailPage({ params, searchParams }: PageProps) {
  const { domain } = await params;
  const { timeRange = 'last30days' } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: domainData, error } = await supabase
    .from("domains")
    .select("*")
    .eq("domain", decodeURIComponent(domain))
    .eq("user_id", user.id)
    .single();

  if (error || !domainData) {
    console.error("Error fetching domain:", error);
    notFound();
  }

  const analytics = await fetchEnhancedAnalytics(supabase, domain, timeRange);
  const groupedPageViews = groupPageViews(analytics.pageViews);
  const groupedPageSources = groupPageSources(analytics.visits);

  const totalStats = analytics.dailyStats.reduce(
    (
      acc: { visits: number; unique_visitors: number; page_views: number },
      day: DailyStats
    ) => ({
      visits: acc.visits + (day.visits || 0),
      unique_visitors: acc.unique_visitors + (day.unique_visitors || 0),
      page_views: acc.page_views + (day.page_views || 0),
    }),
    { visits: 0, unique_visitors: 0, page_views: 0 }
  );

  return (
    <div className="min-h-screen bg-black">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_200px,#7c3aed15,transparent)] sm:bg-[radial-gradient(circle_1000px_at_50%_200px,#7c3aed15,transparent)]" />
        <div className="absolute top-1/4 left-10 sm:left-20 w-40 h-40 sm:w-64 sm:h-64 bg-gradient-to-br from-blue-600/10 to-indigo-600/10 rounded-full filter blur-3xl" />
        <div className="absolute bottom-1/3 right-10 sm:right-20 w-40 h-40 sm:w-72 sm:h-72 bg-gradient-to-br from-indigo-600/10 to-blue-600/10 rounded-full filter blur-3xl" />
      </div>

      <Header user={user} />

      <main className="relative z-10 py-6 sm:py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1 sm:mb-2">
                <Link 
                  href="/dashboard" 
                  className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors font-jakarta"
                >
                  Domains
                </Link>
                <span className="text-gray-600">/</span>
                <span className="text-xs sm:text-sm text-white font-jakarta truncate max-w-[150px] sm:max-w-none">{domainData.domain}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-oswald text-white tracking-tight">Analytics Overview</h1>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 sm:mt-0">
              <TrackingScript domain={domainData.domain} />
              <ExportButton
                domain={domainData.domain}
                timeRange={timeRange}
                totalStats={totalStats}
                dailyStats={analytics.dailyStats}
                groupedPageViews={groupedPageViews}
                groupedPageSources={groupedPageSources}
                deviceStats={analytics.deviceStats}
                countryStats={analytics.countryStats}
                osStats={analytics.osStats}
                events={analytics.events}
              />
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <AnalyticsClient
              domain={domainData.domain}
              initialPageViews={analytics.pageViews}
              initialVisits={analytics.visits}
              initialGroupedPageViews={groupedPageViews}
              initialGroupedPageSources={groupedPageSources}
              initialDailyStats={analytics.dailyStats}
              deviceStats={analytics.deviceStats}
              countryStats={analytics.countryStats}
              osStats={analytics.osStats}
              totalStats={totalStats}
              events={analytics.events}
              timeRange={timeRange}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
