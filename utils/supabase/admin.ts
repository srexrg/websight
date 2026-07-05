import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Privileged client for server-only code paths (ingestion, analytics
 * queries, backfill). Never import from client components.
 *
 * Accepts either key system: SUPABASE_SECRET_KEY (sb_secret_..., new) or
 * SUPABASE_SERVICE_ROLE_KEY (legacy JWT). Falls back to the public key when
 * neither is set so local dev against a project without the key degrades
 * loudly (RLS will reject the new analytics tables) instead of crashing at
 * import time.
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY)",
    );
  }

  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
