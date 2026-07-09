"use client";

import { useState } from "react";
import { ArrowRight, LockKey } from "@phosphor-icons/react";
import { BrandSplit } from "@/components/onboarding/brand-split";

/**
 * Password gate for protected share links (docs/redesign/15). On success the
 * server sets a scoped httpOnly cookie; we reload so the dashboard renders.
 * Wrapped in the shared brand shell so a shared link feels like WebSight.
 */
export function PasswordGate({ token, siteName }: { token: string; siteName: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(false);
    const res = await fetch(`/api/share/${token}/unlock`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setPending(false);
    if (res.ok) {
      window.location.reload();
    } else {
      setError(true);
    }
  }

  return (
    <BrandSplit
      eyebrow="Shared dashboard"
      title="You've been handed the keys"
      subtitle="This dashboard was shared with you privately. Enter the password to see it live."
      ticks={["Realtime visitor data", "Updated as it happens", "No account required"]}
      footnote="Powered by WebSight"
    >
      <form onSubmit={submit}>
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-brand">
          <LockKey size={24} weight="bold" />
        </span>
        <h1 className="mt-4 text-[20px] font-bold tracking-[-0.4px] text-foreground">{siteName}</h1>
        <p className="mt-1.5 text-[13.5px] text-muted-foreground">This dashboard is password-protected.</p>

        <label htmlFor="ws-share-pw" className="mb-1.5 mt-6 block text-[12.5px] font-semibold text-foreground">
          Password
        </label>
        <input
          id="ws-share-pw"
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          className="w-full rounded-lg border border-input bg-card px-3 py-2.5 text-[14px] text-foreground outline-none transition-shadow focus:border-brand focus:shadow-[0_0_0_3px_rgba(14,156,110,.14)]"
        />
        {error && <p className="mt-2 text-[12px] text-danger">Incorrect password. Try again.</p>}
        <button
          type="submit"
          disabled={pending || !password}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_2px_8px_rgba(14,156,110,.30)] transition-all hover:bg-brand/90 disabled:opacity-50 disabled:shadow-none"
        >
          {pending ? "Checking…" : "View dashboard"}
          {!pending && <ArrowRight size={15} weight="bold" />}
        </button>
      </form>
    </BrandSplit>
  );
}
