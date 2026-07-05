import { createClient } from "@/utils/supabase/server";
import { ProfileDetailScreen } from "@/components/dashboard/screens/profile-detail-screen";
import { ProfilesLocked } from "@/components/dashboard/profiles/profiles-locked";

export const metadata = { title: "Profile" };

export default async function ProfileDetailPage({
  params,
}: {
  params: Promise<{ site: string; visitorId: string }>;
}) {
  const { site, visitorId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("sites")
    .select("privacy_mode")
    .eq("public_id", site)
    .maybeSingle();

  // Guard: profile deep-links must not 404 in stateless mode - explain instead.
  if (data?.privacy_mode === "stateless") return <ProfilesLocked site={site} />;
  return <ProfileDetailScreen site={site} profileKey={decodeURIComponent(visitorId)} />;
}
