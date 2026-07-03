import { execSync } from "child_process";

export type LocalStack = { url: string; serviceKey: string };

let cached: LocalStack | null | undefined;

/**
 * Discovers the local Supabase stack (npx supabase status). Integration tests
 * self-skip when no stack is running, so `npm test` works everywhere and runs
 * the full pipeline suite when `npx supabase start` is up.
 */
export function localStack(): LocalStack | null {
  if (cached !== undefined) return cached;
  try {
    const out = execSync("npx supabase status -o json", {
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 30000,
    }).toString();
    const status = JSON.parse(out.slice(out.indexOf("{")));
    if (status.API_URL && status.SERVICE_ROLE_KEY) {
      cached = { url: status.API_URL, serviceKey: status.SERVICE_ROLE_KEY };
      return cached;
    }
  } catch {
    // fall through
  }
  cached = null;
  return null;
}
