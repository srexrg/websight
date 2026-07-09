"use client";

import Link from "next/link";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import type { SessionRow } from "@/lib/analytics/queries";
import { useSessionEvents } from "@/lib/dashboard/use-analytics";
import { countryFlag, countryName } from "@/components/dashboard/screens/shared";
import { formatDuration, formatRelativeTime } from "@/lib/dashboard/format";
import { visitorColor, visitorLabel } from "./session-row";
import { EventTimeline } from "./event-timeline";

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={`truncate text-foreground ${mono ? "font-mono text-[11.5px]" : "text-[12.5px]"}`}>
        {value}
      </dd>
    </div>
  );
}

export function SessionDrawer({
  site,
  session,
  onClose,
}: {
  site: string;
  session: SessionRow | null;
  onClose: () => void;
}) {
  const q = useSessionEvents(site, session?.id ?? null, session?.isOpen ?? false);
  const place =
    session &&
    `${session.country ? countryFlag(session.country) + " " : ""}${
      [session.city, session.country ? countryName(session.country) : null]
        .filter(Boolean)
        .join(", ") || "Unknown"
    }`;

  return (
    <Sheet open={!!session} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="gap-0 p-0">
        {session && (
          <>
            <div className="border-b border-border px-5 pb-4 pt-5 pr-10">
              <SheetTitle className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: visitorColor(session.visitorId) }}
                  aria-hidden
                />
                <span className="truncate">{visitorLabel(session)}</span>
                {session.isOpen && (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#12291F] px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-[#5FC2A0]">
                    <span className="h-1 w-1 rounded-full bg-[#5FD3A6] [animation:wsBlink_1.4s_ease-in-out_infinite]" />
                    LIVE
                  </span>
                )}
              </SheetTitle>
              <SheetDescription>
                {formatRelativeTime(session.startedAt)} · {session.pageviews} pageview
                {session.pageviews === 1 ? "" : "s"} · {formatDuration(session.durationS)}
              </SheetDescription>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                <Meta label="Location" value={place || "Unknown"} />
                <Meta
                  label="Device"
                  value={[session.browser, session.os, session.deviceType].filter(Boolean).join(" · ") || "-"}
                />
                <Meta label="Channel" value={session.channel || "Direct"} />
                <Meta label="Referrer" value={session.referrerDomain || "-"} />
                <Meta label="Entry" value={session.entryPath || "-"} mono />
                <Meta label="Exit" value={session.exitPath || "-"} mono />
              </dl>
              <Link
                href={`/${site}/profiles/${encodeURIComponent(session.userId ?? session.visitorId)}`}
                className="mt-3 inline-block text-[12px] font-medium text-brand hover:underline"
              >
                View profile &rarr;
              </Link>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <EventTimeline events={q.data} isPending={q.isPending} isError={q.isError} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
