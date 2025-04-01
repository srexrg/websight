import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GlobeIcon, ArrowLeftIcon, Settings, Bell } from "lucide-react";
import { AnalyticsClient } from "@/components/analytics/AnalyticsClient";
import { fetchEnhancedAnalytics } from "@/lib/actions/analytics";
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

export default async function WebsiteDetailPage(props: { params: paramsType }) {
  const { domain } = await props.params;
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

  const analytics = await fetchEnhancedAnalytics(supabase, domain);

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

  const createdAt = new Date(domainData.created_at).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  return (
    <div className="flex flex-col min-h-screen bg-black">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_200px,#7c3aed15,transparent)]" />
        <div className="absolute top-1/4 left-20 w-64 h-64 bg-gradient-to-br from-violet-600/10 to-indigo-600/10 rounded-full filter blur-3xl" />
        <div className="absolute bottom-1/3 right-20 w-72 h-72 bg-gradient-to-br from-indigo-600/10 to-violet-600/10 rounded-full filter blur-3xl" />
      </div>

      <header className="border-b border-zinc-800 py-4 backdrop-blur-xl bg-black/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <Link href="/dashboard">
                  <div className="p-1.5 bg-violet-600/10 rounded-lg cursor-pointer hover:bg-violet-600/20 transition-colors">
                    <GlobeIcon className="h-6 w-6 text-violet-500" />
                  </div>
                </Link>
                <Link 
                  href="/dashboard" 
                  className="text-xl font-semibold text-white hover:text-violet-400 transition-colors"
                >
                  WebSight
                </Link>
              </div>
              
              <div className="hidden md:flex items-center gap-1">
                <Link href="/dashboard">
                  <Button 
                    variant="ghost" 
                    className="text-gray-400 hover:text-white"
                  >
                    Dashboard
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button 
                    variant="ghost" 
                    className="text-gray-400 hover:text-white"
                  >
                    Settings
                  </Button>
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <Bell className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <Settings className="h-5 w-5" />
              </Button>
              <div className="h-8 w-px bg-zinc-800"></div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">{user?.email}</span>
                <div className="h-8 w-8 rounded-full bg-violet-600/10 flex items-center justify-center">
                  <span className="text-sm font-medium text-violet-500">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 py-8 relative z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                  Domains
                </Link>
                <span className="text-gray-600">/</span>
                <span className="text-white font-medium">{domainData.domain}</span>
              </div>
              <h1 className="text-2xl font-bold text-white">Analytics Overview</h1>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                className="bg-zinc-900/80 hover:bg-zinc-800/90 text-gray-300 hover:text-white border-zinc-700 hover:border-violet-500/50 transition-all duration-300"
              >
                Export Data
              </Button>
              <Button 
                className="bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 transition-all duration-300"
              >
                View Live Data
              </Button>
            </div>
          </div>

          <div className="space-y-6">
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
            />
          </div>
        </div>
      </main>
    </div>
  );
}
