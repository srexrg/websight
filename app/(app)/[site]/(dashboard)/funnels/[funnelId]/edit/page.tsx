import { createClient } from "@/utils/supabase/server";
import { FunnelEditLoader } from "@/components/dashboard/funnels/funnel-edit-loader";

export const metadata = { title: "Edit funnel" };

export default async function EditFunnelPage({
  params,
}: {
  params: Promise<{ site: string; funnelId: string }>;
}) {
  const { site, funnelId } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("sites").select("privacy_mode").eq("public_id", site).maybeSingle();
  return <FunnelEditLoader site={site} funnelId={funnelId} stateless={data?.privacy_mode === "stateless"} />;
}
