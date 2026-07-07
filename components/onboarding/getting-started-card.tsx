"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

type Status = { installed: boolean; hasPageview: boolean; hasCustomEvent: boolean; hasGoal: boolean; mature: boolean };

/**
 * Overview getting-started checklist (docs/redesign/17 M4): shown until a site
 * has accumulated data. Every item derives from actual data, so it self-
 * completes. Renders nothing once the site is mature.
 */
export function GettingStartedCard({ site }: { site: string }) {
  const q = useQuery<Status>({
    queryKey: ["onboarding", site],
    queryFn: async () => {
      const res = await fetch(`/api/sites/${site}/onboarding`);
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    staleTime: 60_000,
  });

  if (!q.data || q.data.mature) return null;
  const s = q.data;

  const items = [
    { done: s.installed, label: "Install the tracking snippet", href: `/${site}/settings` },
    { done: s.hasPageview, label: "Receive your first pageview", href: `/${site}/settings` },
    { done: s.hasGoal, label: "Define a conversion goal", href: `/${site}/goals` },
    { done: s.hasCustomEvent, label: "Track a custom event", href: "/docs/custom-events" },
  ];
  const doneCount = items.filter((i) => i.done).length;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-foreground">Getting started</h3>
        <span className="font-mono text-[11.5px] text-muted-foreground">{doneCount}/{items.length}</span>
      </div>
      <p className="mt-0.5 text-[12.5px] text-muted-foreground">A few steps to get the most out of WebSight.</p>
      <ul className="mt-3 space-y-1.5">
        {items.map((it) => (
          <li key={it.label}>
            <Link href={it.href} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-secondary/50">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[12px] ${
                  it.done ? "bg-brand/15 text-brand" : "border border-border text-transparent"
                }`}
              >
                ✓
              </span>
              <span className={`text-[13px] ${it.done ? "text-muted-foreground line-through" : "text-foreground"}`}>{it.label}</span>
              {!it.done && <span className="ml-auto text-[12px] text-muted-foreground">→</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
