import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { DashboardProviders } from "@/components/dashboard/providers";

/** Authed app group (docs/redesign/03): session gate + client providers. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  return <DashboardProviders>{children}</DashboardProviders>;
}
