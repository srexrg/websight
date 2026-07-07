import Link from "next/link";

/** Subtle growth-loop footer on public dashboards (docs/redesign/15). */
export function PoweredBadge() {
  return (
    <div className="flex justify-center py-6">
      <Link
        href="https://websight.srexrg.me"
        target="_blank"
        rel="noopener"
        className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11.5px] text-muted-foreground shadow-[0_1px_2px_rgba(16,24,40,.04)] transition-colors hover:text-foreground"
      >
        <span className="h-2 w-2 rounded-full bg-brand" />
        Powered by <span className="font-semibold text-foreground">WebSight</span>
      </Link>
    </div>
  );
}
