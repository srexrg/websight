import { notFound, permanentRedirect, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

/**
 * Legacy URL: /website/[domain] permanently redirects to the new
 * /[site]/overview route (docs/redesign/03 cutover).
 */
export default async function LegacyWebsitePage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: site } = await supabase
    .from("sites")
    .select("public_id")
    .contains("domains", [decodeURIComponent(domain).toLowerCase()])
    .maybeSingle();
  if (!site) notFound();

  permanentRedirect(`/${site.public_id}/overview`);
}
