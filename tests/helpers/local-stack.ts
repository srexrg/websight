import { execSync } from "child_process";
import { loadEnvLocal } from "../../lib/env-local";

export type TestStack = {
  url: string;
  serviceKey: string;
  /** Where the credentials came from - "env" is the cloud project in .env.local. */
  source: "env" | "local";
};

let cached: TestStack | null | undefined;

/**
 * Discovers the Supabase stack to run integration tests against.
 *
 * 1. `.env.local` / process env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY
 *    (or legacy SUPABASE_SERVICE_ROLE_KEY) - the cloud project. Tests create
 *    run-scoped throwaway sites/users and clean up after themselves.
 * 2. Fallback: a running local stack via `npx supabase status`.
 *
 * Integration tests self-skip when neither is available, so `npm test` works
 * everywhere.
 */
export function localStack(): TestStack | null {
  if (cached !== undefined) return cached;

  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceKey) {
    cached = { url, serviceKey, source: "env" };
    return cached;
  }

  try {
    const out = execSync("npx supabase status -o json", {
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 30000,
    }).toString();
    const status = JSON.parse(out.slice(out.indexOf("{")));
    if (status.API_URL && status.SERVICE_ROLE_KEY) {
      cached = { url: status.API_URL, serviceKey: status.SERVICE_ROLE_KEY, source: "local" };
      return cached;
    }
  } catch {
    // fall through
  }
  cached = null;
  return null;
}
