import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { VitalsScreen } from "@/components/dashboard/screens/vitals-screen";

export const metadata = { title: "Web Vitals" };

export default async function VitalsPage({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("sites")
    .select("public_id, domains, settings")
    .eq("public_id", site)
    .maybeSingle();
  if (!data) notFound();

  const settings = (data.settings as Record<string, unknown> | null) ?? {};
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://websight.srexrg.me";
  const snippet = `<script defer src="${origin}/t.js" data-site="${data.domains[0] ?? data.public_id}" data-vitals></script>`;

  return <VitalsScreen site={site} vitalsEnabled={settings.vitals_enabled === true} snippet={snippet} />;
}
