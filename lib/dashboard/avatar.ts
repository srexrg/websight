import { createAvatar } from "@dicebear/core";
import { avataaars } from "@dicebear/collection";

/**
 * Deterministic, privacy-safe cartoon avatars for the globe (docs/redesign/06).
 * WebSight is anonymous - these are generated from a seed (visitor id, or a
 * country+slot key), never a real photo. Same seed always yields the same face,
 * so a returning visitor keeps their look. Rendered as a data URI to keep the
 * marker DOM light. Memoized because the globe regenerates markers on each poll.
 */
const cache = new Map<string, string>();

const BG = ["b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf", "c8f7dc", "ffe7a3"];

export function avatarDataUri(seed: string): string {
  const hit = cache.get(seed);
  if (hit) return hit;
  const uri = createAvatar(avataaars, {
    seed,
    radius: 50,
    backgroundColor: BG,
    backgroundType: ["solid"],
  }).toDataUri();
  cache.set(seed, uri);
  return uri;
}
