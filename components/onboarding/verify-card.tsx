"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Broadcast, CheckCircle } from "@phosphor-icons/react";
import { countryFlag, countryName } from "@/components/dashboard/screens/shared";

type Status = { scriptSeen: boolean; firstEvent: boolean; sample: { path: string | null; country: string | null; device: string | null; browser: string | null } | null };

/**
 * Live install verification (docs/redesign/17): polls install-status every 3s
 * and, on the first received event, echoes it back ("we see you, from Berlin,
 * on Chrome") - the activation magic moment.
 */
export function VerifyCard({ site, onVerified }: { site: string; onVerified: () => void }) {
  const reduce = useReducedMotion();
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
          <motion.span
            initial={reduce ? false : { scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 320, damping: 18 }}
            className="mx-auto flex h-16 w-16 items-center justify-center text-brand"
          >
            <CheckCircle size={56} weight="fill" />
          </motion.span>
          <h2 className="mt-3 text-[18px] font-bold tracking-[-0.3px] text-foreground">You&apos;re live!</h2>
          {s && (
            <p className="mx-auto mt-2 max-w-[300px] rounded-xl bg-accent px-3.5 py-2.5 text-[13px] leading-relaxed text-accent-foreground">
              We just saw a visit
              {s.country ? <> from {countryFlag(s.country)} {countryName(s.country)}</> : null}
              {s.browser ? <> on {s.browser}</> : null}
              {s.path ? <> at <code className="font-mono font-semibold">{s.path}</code></> : null}.
            </p>
          )}
          <button
            onClick={onVerified}
            className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_2px_8px_rgba(14,156,110,.30)] transition-all hover:bg-brand/90"
          >
            View your dashboard <ArrowRight size={14} weight="bold" />
          </button>
        </>
      ) : (
        <>
          <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
            {!reduce && (
              <>
                <span className="absolute inset-0 rounded-full bg-brand/25" style={{ animation: "wsPulse 2.2s ease-out infinite" }} />
                <span className="absolute inset-0 rounded-full bg-brand/25" style={{ animation: "wsPulse 2.2s ease-out infinite", animationDelay: "1.1s" }} />
              </>
            )}
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-accent text-brand">
              <Broadcast size={26} weight="bold" />
            </span>
          </div>
          <h2 className="mt-4 text-[15.5px] font-semibold text-foreground">Listening for your first pageview…</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
            Open your site in a new tab to send a test visit. This updates automatically.
          </p>
          <details className="group mt-4 rounded-xl border border-border bg-page/60 p-3 text-left">
            <summary className="cursor-pointer list-none text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground">
              Not seeing anything?
            </summary>
            <ul className="mt-2.5 space-y-1.5 text-[12px] leading-relaxed text-muted-foreground">
              <li>&bull; <b className="font-semibold text-foreground">localhost is ignored</b> by design - test on your deployed domain, not localhost.</li>
              <li>&bull; An <b className="font-semibold text-foreground">ad-blocker</b> may block the script - disable it, or proxy the script from your own domain.</li>
              <li>&bull; Check the snippet is inside <code className="font-mono">&lt;head&gt;</code> and the site is deployed.</li>
              <li>&bull; A strict <b className="font-semibold text-foreground">CSP</b> must allow the script&apos;s origin in <code className="font-mono">script-src</code>.</li>
            </ul>
          </details>
          <button
            onClick={onVerified}
            className="mt-4 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            I&apos;ll do this later →
          </button>
        </>
      )}
    </div>
  );
}
