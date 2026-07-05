import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * Resolve a site by public_id AS THE SIGNED-IN USER (RLS on `sites` means
 * foreign/unknown ids return nothing). Returns the internal site id + user id,
 * or a ready-to-return 401/404 response. Shared by owner-only write routes.
 */
export async function resolveOwnedSite(
  publicId: string,
): Promise<{ siteId: string; userId: string } | { error: NextResponse }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const { data: site } = await supabase
    .from("sites")
    .select("id")
    .eq("public_id", publicId)
    .maybeSingle();
  if (!site) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };

  return { siteId: site.id as string, userId: user.id as string };
}
