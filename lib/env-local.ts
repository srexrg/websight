import { existsSync, readFileSync } from "fs";
import path from "path";

/**
 * Minimal .env.local loader for contexts outside the Next.js runtime (vitest,
 * tsx scripts). Next.js loads .env.local itself; this mirrors that for tools.
 * Existing process.env values always win.
 */
export function loadEnvLocal(root: string = process.cwd()): void {
  const file = path.join(root, ".env.local");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
