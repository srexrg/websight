"use client";

import { useState } from "react";

/**
 * Minimal password gate for protected share links (docs/redesign/15). On success
 * the server sets a scoped httpOnly cookie; we reload so the dashboard renders.
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
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-[0_1px_2px_rgba(16,24,40,.04)]">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-[20px]">🔒</span>
        <h1 className="mt-3 text-[16px] font-semibold text-foreground">{siteName}</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">This dashboard is password-protected.</p>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="mt-4 w-full rounded-md border border-input bg-transparent px-3 py-2 text-[13px] text-foreground outline-none focus:border-ring"
        />
        {error && <p className="mt-2 text-[12px] text-danger">Incorrect password. Try again.</p>}
        <button
          type="submit"
          disabled={pending || !password}
          className="mt-3 w-full rounded-md bg-brand px-3 py-2 text-[13px] font-medium text-brand-foreground hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Checking…" : "View dashboard"}
        </button>
      </form>
    </div>
  );
}
