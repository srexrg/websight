import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { GlobeIcon, ArrowLeftIcon } from "lucide-react";
import { AnalyticsClient } from "@/components/analytics/AnalyticsClient";
import { Database } from "@/lib/database.types";

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
  }
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

  const [domainResponse, viewsResponse, visitsResponse] = await Promise.all([
    supabase
      .from("domains")
      .select("*")
      .eq("domain", decodeURIComponent(domain))
      .eq("user_id", user.id)
      .single(),
    supabase.from("page_views").select().eq("domain", domain),
    supabase.from("visits").select().eq("website_id", domain)
  ]);

  const { data: domainData, error } = domainResponse;
  const pageViews = viewsResponse.data || [];
  const visits = visitsResponse.data || [];

  if (error || !domainData) {
    console.error("Error fetching domain:", error);
    notFound();
  }

  // Process analytics data
  const groupedPageViews = groupPageViews(pageViews);
  const groupedPageSources = groupPageSources(visits);

  const createdAt = new Date(domainData.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="border-b py-6">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Link href="/dashboard">
                <div className="p-1.5 bg-primary/10 rounded-lg cursor-pointer hover:bg-primary/20 transition-colors">
                  <GlobeIcon className="h-6 w-6 text-primary" />
                </div>
              </Link>
              <Link 
                href="/dashboard" 
                className="text-xl font-semibold hover:text-primary transition-colors"
              >
                WebSight
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link 
                href="/settings" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Settings
              </Link>
              <span className="text-sm text-muted-foreground">{user.email}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="inline-block mb-6">
            <Button variant="ghost" className="flex items-center gap-1 pl-0 cursor-pointer">
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold">{domainData.domain}</h1>
            <p className="text-muted-foreground mt-1">Added on {createdAt}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Domain Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Domain Name</h3>
                    <p className="text-lg">{domainData.domain}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Date Added</h3>
                    <p>{createdAt}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Website URL</h3>
                    <a 
                      href={`https://${domainData.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1.5"
                    >
                      Visit website
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M7 7h10v10" />
                        <path d="M7 17 17 7" />
                      </svg>
                    </a>
                  </div>
                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Tracking Script</h3>
                    <div className="bg-black/5 dark:bg-white/5 rounded-lg p-3 text-xs font-mono">
                      {`<script src="${process.env.NEXT_PUBLIC_APP_URL}/tracker.js" data-site="${domainData.domain}"></script>`}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Website Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <AnalyticsClient 
                  domain={domainData.domain}
                  initialPageViews={pageViews}
                  initialVisits={visits}
                  initialGroupedPageViews={groupedPageViews}
                  initialGroupedPageSources={groupedPageSources}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}