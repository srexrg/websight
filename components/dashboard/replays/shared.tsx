import type { ReplayRow } from "@/lib/analytics/queries";
import { visitorColor, visitorCode } from "@/components/dashboard/sessions/session-row";

/** Bytes -> compact mono-friendly size, e.g. "820 KB" / "4.2 MB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

/** Human-friendly, non-identifying label for a recording's visitor. */
export function replayVisitorLabel(r: Pick<ReplayRow, "visitorId" | "userId">): string {
  if (r.userId) return r.userId;
  return `Visitor ${visitorCode(r.visitorId)}`;
}

/** The identicon dot the sessions surface uses, so a visitor reads the same everywhere. */
export function VisitorDot({ id, size = 10 }: { id: string; size?: number }) {
  return (
    <span
      className="shrink-0 rounded-full"
      style={{ background: visitorColor(id), height: size, width: size }}
      aria-hidden
    />
  );
}

/** The live pulse chip, matching the sessions drawer / row exactly. */
export function LiveChip() {
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#12291F] px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-[#5FC2A0]">
      <span className="h-1 w-1 rounded-full bg-[#5FD3A6] [animation:wsBlink_1.4s_ease-in-out_infinite]" />
      LIVE
    </span>
  );
}

/** Muted chip for recordings retention has aged out. */
export function ExpiredChip() {
  return (
    <span
      title="Expired per the site's retention policy"
      className="shrink-0 rounded-full bg-secondary px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-muted-foreground"
    >
      EXPIRED
    </span>
  );
}
