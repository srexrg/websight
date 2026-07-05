import { createClient } from "@/utils/supabase/server";
import { FunnelEditor } from "@/components/dashboard/funnels/funnel-editor";

export const metadata = { title: "New funnel" };

export default async function NewFunnelPage({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("sites").select("privacy_mode").eq("public_id", site).maybeSingle();
  return <FunnelEditor site={site} funnel={null} stateless={data?.privacy_mode === "stateless"} />;
}
