"use client";

import { useEffect, useState } from "react";
import { countryFlag, countryName } from "@/components/dashboard/screens/shared";

type Status = { scriptSeen: boolean; firstEvent: boolean; sample: { path: string | null; country: string | null; device: string | null; browser: string | null } | null };

/**
 * Live install verification (docs/redesign/17): polls install-status every 3s
 * and, on the first received event, echoes it back ("we see you, from Berlin,
 * on Chrome") - the activation magic moment.
 */
export function VerifyCard({ site, onVerified }: { site: string; onVerified: () => void }) {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/sites/${site}/install-status`);
        if (!res.ok) return;
        const data = (await res.json()) as Status;
        if (active) setStatus(data);
      } catch {
        /* transient */
      }
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [site]);

  const verified = status?.firstEvent;
  const s = status?.sample;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      {verified ? (
        <>
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand/15 text-[24px] text-brand">✓</span>
          <h2 className="mt-3 text-[17px] font-semibold text-foreground">You&apos;re live!</h2>
          {s && (
            <p className="mt-1 text-[13px] text-muted-foreground">
              We just saw a visit
              {s.country ? <> from {countryFlag(s.country)} {countryName(s.country)}</> : null}
              {s.browser ? <> on {s.browser}</> : null}
              {s.path ? <> at <code className="font-mono text-foreground">{s.path}</code></> : null}.
            </p>
          )}
          <button
            onClick={onVerified}
            className="mt-4 rounded-md bg-brand px-4 py-2 text-[13px] font-medium text-brand-foreground hover:opacity-90"
          >
            View your dashboard →
          </button>
        </>
      ) : (
        <>
          <span className="mx-auto flex h-12 w-12 animate-pulse items-center justify-center rounded-full bg-secondary text-[22px]">📡</span>
          <h2 className="mt-3 text-[17px] font-semibold text-foreground">Waiting for your first pageview…</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Open your site in a new tab to send a test visit. This updates automatically.
          </p>
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-[12.5px] font-medium text-muted-foreground hover:text-foreground">
              Not seeing anything?
            </summary>
            <ul className="mt-2 space-y-1.5 pl-1 text-[12px] leading-relaxed text-muted-foreground">
              <li>• <b>localhost is ignored</b> by design - test on your deployed domain, not localhost.</li>
              <li>• An <b>ad-blocker</b> may block the script - disable it, or proxy the script from your own domain.</li>
              <li>• Check the snippet is inside <code className="font-mono">&lt;head&gt;</code> and the site is deployed.</li>
              <li>• A strict <b>CSP</b> must allow the script&apos;s origin in <code className="font-mono">script-src</code>.</li>
            </ul>
          </details>
          <button
            onClick={onVerified}
            className="mt-4 text-[12.5px] text-muted-foreground hover:text-foreground"
          >
            I&apos;ll do this later →
          </button>
        </>
      )}
    </div>
  );
}
