import type { ErrorStatus } from "@/lib/analytics/errors";

/** Muted "external script" chip - the #1 error-noise source. */
export function ExternalChip() {
  return (
    <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      external script
    </span>
  );
}

/** "regressed" badge for a resolved group that recurred. */
export function RegressedBadge() {
  return (
    <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-danger" style={{ background: "color-mix(in oklab, var(--danger) 16%, transparent)" }}>
      regressed
    </span>
  );
}

const STATUS_STYLE: Record<ErrorStatus, string> = {
  open: "text-danger",
  resolved: "text-[var(--success)]",
  ignored: "text-muted-foreground",
};

export function StatusDot({ status }: { status: ErrorStatus }) {
  const color = status === "open" ? "var(--danger)" : status === "resolved" ? "var(--success)" : "var(--muted-foreground)";
  return <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} aria-label={status} />;
}

export { STATUS_STYLE };
