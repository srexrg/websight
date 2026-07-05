"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { normalizeSiteKey } from "@/lib/analytics/sites";

/**
 * Site management actions (docs/redesign/03). Ownership is checked with the
 * signed-in user's client (RLS); writes go through the admin client because
 * `authenticated` only has SELECT on `sites`. A legacy `domains` row is kept
 * in sync so the old tracker keeps resolving during the transition.
 */

export async function createSite(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const raw = String(formData.get("domain") ?? "");
  const domain = normalizeSiteKey(raw);
  if (!domain || !domain.includes(".")) return { error: "Enter a valid domain like example.com" };

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("sites")
    .select("id")
    .contains("domains", [domain])
    .maybeSingle();
  if (existing) return { error: "That domain is already registered" };

  const { error } = await admin
    .from("sites")
    .insert({ name: domain, domains: [domain], user_id: user.id });
  if (error) return { error: error.message };

  await admin.from("domains").insert({ domain, user_id: user.id });
  revalidatePath("/dashboard");
  return {};
}

export async function deleteSite(publicId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  // RLS: only resolves if the site belongs to this user.
  const { data: site } = await supabase
    .from("sites")
    .select("id, domains")
    .eq("public_id", publicId)
    .maybeSingle();
  if (!site) return { error: "Site not found" };

  const admin = createAdminClient();
  await admin.from("events").delete().eq("site_id", site.id);
  await admin.from("sessions").delete().eq("site_id", site.id);
  await admin.from("rollup_daily").delete().eq("site_id", site.id);
  const { error } = await admin.from("sites").delete().eq("id", site.id);
  if (error) return { error: error.message };
  if (site.domains?.length) {
    await admin.from("domains").delete().in("domain", site.domains).eq("user_id", user.id);
  }
  revalidatePath("/dashboard");
  return {};
}
