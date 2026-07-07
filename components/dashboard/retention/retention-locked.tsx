import Link from "next/link";

/**
 * Stateless-mode degradation for Retention (docs/redesign/11). Cross-interval
 * retention requires stable visitor identity across days; stateless mode resets
 * visitor ids daily, so a cohort grid would be silently wrong. We say so plainly
 * and point to persistent mode / identify() instead of showing bad numbers.
 */
export function RetentionLocked({ site }: { site: string }) {
  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-border bg-card p-8 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <div className="max-w-md text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-[20px]">
          🔒
        </span>
        <h2 className="mt-3 text-[16px] font-semibold text-foreground">
          Retention needs persistent mode
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          This site uses <span className="font-medium text-foreground">stateless</span> privacy
          mode, so visitor ids reset each day and can&apos;t be linked across weeks. Measuring
          whether visitors come back would produce misleading numbers, so we don&apos;t show a grid
          rather than show one that&apos;s wrong.
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Switch to persistent mode, or call{" "}
          <code className="rounded bg-secondary px-1 font-mono text-[12px] text-foreground">
            websight.identify()
          </code>{" "}
          to link known users. That&apos;s a deliberate privacy trade-off: persistent mode stores a
          durable visitor id.
        </p>
        <Link
          href={`/${site}/settings`}
          className="mt-4 inline-block rounded-md bg-brand px-3 py-1.5 text-[13px] font-medium text-brand-foreground hover:opacity-90"
        >
          Open privacy settings
        </Link>
      </div>
    </div>
  );
}
