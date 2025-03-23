import { createClient } from "@/utils/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { GlobeIcon, ArrowLeftIcon } from "lucide-react";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function WebsiteDetailPage({ params }: PageProps) {
  const { id } = params;
  const supabase = await createClient();

  // Check user authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  // Fetch domain details
  const { data: domain, error } = await supabase
    .from("domains")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !domain) {
    console.error("Error fetching domain:", error);
    notFound();
  }

  // Format creation date
  const createdAt = new Date(domain.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="border-b py-6">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <GlobeIcon className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-xl font-semibold">WebSight</h1>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">{user.email}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back button */}
          <Link href="/dashboard" className="inline-block mb-6">
            <Button variant="ghost" className="flex items-center gap-1 pl-0 cursor-pointer">
              <ArrowLeftIcon className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>

          {/* Domain header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold">{domain.domain}</h1>
            <p className="text-muted-foreground mt-1">Added on {createdAt}</p>
          </div>

          {/* Domain details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Domain information */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Domain Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Domain Name</h3>
                    <p className="text-lg">{domain.domain}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Date Added</h3>
                    <p>{createdAt}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Website URL</h3>
                    <a 
                      href={`https://${domain.domain}`}
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
                </div>
              </CardContent>
            </Card>

            {/* Analytics placeholder */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Website Analytics</CardTitle>
              </CardHeader>
              <CardContent>
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
                  <p className="text-lg mb-2">Analytics coming soon</p>
                  <p className="max-w-md">
                    We're working on bringing you detailed analytics for your website.
                    Check back later for visitor stats, traffic sources, and more.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}