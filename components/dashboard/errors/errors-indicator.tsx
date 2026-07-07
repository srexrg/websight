"use client";

import Link from "next/link";
import { useErrorGroups } from "@/lib/dashboard/use-analytics";
import { formatNumber } from "@/lib/dashboard/format";

/**
 * Overview site-health indicator (docs/redesign/13 M4): shows the count of open
 * error groups in the last 24h, linking to the Errors screen. Renders nothing
 * when there are no open errors, so a healthy site stays calm.
 */
export function ErrorsIndicator({ site }: { site: string }) {
  const q = useErrorGroups(site, { range: "24h", f: "" }, "open");
  const count = q.data?.length ?? 0;
  if (!q.data || count === 0) return null;

  const occurrences = q.data.reduce((s, g) => s + g.occurrences, 0);
  return (
    <Link
      href={`/${site}/errors`}
      className="flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 transition-colors hover:bg-secondary/40"
      style={{ borderColor: "color-mix(in oklab, var(--danger) 35%, var(--border))" }}
    >
      <span className="flex items-center gap-2 text-[13px] text-foreground">
        <span className="h-2 w-2 rounded-full bg-danger" />
        <span className="font-semibold">{count}</span> open error{count === 1 ? "" : "s"} in the last 24h
        <span className="text-muted-foreground">· {formatNumber(occurrences)} occurrences</span>
      </span>
      <span className="text-[12px] text-muted-foreground">View &rarr;</span>
    </Link>
  );
}
