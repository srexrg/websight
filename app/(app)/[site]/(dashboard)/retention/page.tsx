import { createClient } from "@/utils/supabase/server";
import { RetentionScreen } from "@/components/dashboard/screens/retention-screen";
import { RetentionLocked } from "@/components/dashboard/retention/retention-locked";

export const metadata = { title: "Retention" };

export default async function RetentionPage({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("sites")
    .select("privacy_mode")
    .eq("public_id", site)
    .maybeSingle();

  // Cross-day retention needs stable identity; stateless ids reset daily.
  if (data?.privacy_mode === "stateless") return <RetentionLocked site={site} />;
  return <RetentionScreen site={site} />;
}
