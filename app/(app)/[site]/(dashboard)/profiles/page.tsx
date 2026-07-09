import { createClient } from "@/utils/supabase/server";
import { ProfilesScreen } from "@/components/dashboard/screens/profiles-screen";
import { ProfilesLocked } from "@/components/dashboard/profiles/profiles-locked";

export const metadata = { title: "Profiles" };

export default async function ProfilesPage({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("sites")
    .select("privacy_mode")
    .eq("public_id", site)
    .maybeSingle();

  if (data?.privacy_mode === "stateless") return <ProfilesLocked site={site} />;
  return <ProfilesScreen site={site} />;
}
