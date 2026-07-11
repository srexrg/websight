import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Sidebar, type SidebarSite } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { FilterBar } from "@/components/dashboard/filters/filter-bar";

/**
 * Site public_ids are 8 chars of ws_public_id()'s alphabet (lowercase
 * alphanumeric minus l/o/0/1). Random top-level paths like /pricing-old
 * can never be a site, so they 404 before the auth redirect.
 */
const PUBLIC_ID_RE = /^[a-km-np-z2-9]{8}$/;

/**
 * Per-site shell: resolves the site by public_id AS THE SIGNED-IN USER
 * (RLS on `sites` means foreign or unknown ids simply return nothing ->
 * 404, not an error boundary), then renders sidebar + topbar + screen.
 */
export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ site: string }>;
}) {
  const { site: publicId } = await params;
  if (!PUBLIC_ID_RE.test(publicId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const [{ data: site }, { data: sites }] = await Promise.all([
    supabase
      .from("sites")
      .select("public_id, name, domains")
      .eq("public_id", publicId)
      .maybeSingle<SidebarSite>(),
    supabase
      .from("sites")
      .select("public_id, name, domains")
      .order("name")
      .returns<SidebarSite[]>(),
  ]);
  if (!site) notFound();

  return (
    <div className="flex min-h-screen bg-page">
      <div className="hidden md:block">
        <Sidebar
          sites={sites ?? []}
          current={site}
          userEmail={user.email ?? ""}
          userName={(user.user_metadata?.full_name as string) ?? null}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <FilterBar />
        <main className="flex-1 px-6 py-5">{children}</main>
      </div>
    </div>
  );
}
