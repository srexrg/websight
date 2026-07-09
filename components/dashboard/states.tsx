import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Empty / error / loading states (docs/redesign/03): every card and screen
 * ships all three. Empty states teach - say what the feature needs.
 */

export function EmptyState({
  title,
  hint,
  docHref,
  docLabel = "Read the docs",
  icon,
}: {
  title: string;
  hint?: string;
  docHref?: string;
  docLabel?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      {icon}
      <p className="text-[13.5px] font-semibold text-foreground">{title}</p>
      {hint && <p className="max-w-sm text-[12.5px] leading-relaxed text-muted-foreground">{hint}</p>}
      {docHref && (
        <Link
          href={docHref}
          className="mt-1 text-[12.5px] font-semibold text-accent-foreground hover:underline"
        >
          {docLabel} →
        </Link>
      )}
    </div>
  );
}

export function ErrorState({ message = "Something went wrong loading this data." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-6 py-10 text-center">
      <p className="text-[13.5px] font-semibold text-danger">Couldn&apos;t load data</p>
      <p className="text-[12.5px] text-muted-foreground">{message}</p>
    </div>
  );
}

export function Sk({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-secondary ${className}`} />;
}

export function RowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3 px-1 py-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Sk className="h-3.5 flex-1" />
          <Sk className="h-3.5 w-10" />
        </div>
      ))}
    </div>
  );
}
