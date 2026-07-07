import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getTimeseries } from "@/lib/analytics/queries";
import { rangeToDates } from "@/lib/dashboard/range";
import { SitesGrid, type SiteCard } from "@/components/dashboard/sites-grid";
import { AppHeader } from "@/components/dashboard/app-header";

export const metadata = { title: "My Websites" };

type SiteRow = { id: string; public_id: string; name: string; domains: string[] };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: sites } = await supabase
    .from("sites")
    .select("id, public_id, name, domains")
    .order("created_at", { ascending: false })
    .returns<SiteRow[]>();

  // First-run: no sites yet -> guided onboarding (docs/redesign/17).
  if (!sites || sites.length === 0) redirect("/onboarding");

  const range = rangeToDates("7d");
  const cards: SiteCard[] = await Promise.all(
    (sites ?? []).map(async (s) => {
      try {
        const series = await getTimeseries(s.id, range, "day");
        return {
          public_id: s.public_id,
          name: s.name,
          domains: s.domains,
          visitors7d: series.reduce((acc, p) => acc + p.visitors, 0),
          spark: series.map((p) => p.visitors),
        };
      } catch {
        return { public_id: s.public_id, name: s.name, domains: s.domains, visitors7d: 0, spark: [] };
      }
    }),
  );

  return (
    <div className="min-h-screen bg-page">
      <AppHeader
        userEmail={user.email ?? ""}
        userName={(user.user_metadata?.full_name as string) ?? null}
      />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-[21px] font-bold tracking-[-.4px] text-foreground">My Websites</h1>
          <p className="text-[13px] text-muted-foreground">
            All your tracked sites in one place. Click a site to open its dashboard.
          </p>
        </div>
        <SitesGrid sites={cards} />
      </main>
    </div>
  );
}
