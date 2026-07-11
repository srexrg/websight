"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SignOut } from "@phosphor-icons/react";
import { createClient } from "@/utils/supabase/client";

/**
 * Account settings profile card: identity block + session actions. Avatar
 * prefers the OAuth picture, falls back to the accent initial used across the
 * app shell.
 */
export function ProfileCard({
  name,
  email,
  avatarUrl,
  provider,
  memberSince,
}: {
  name: string | null;
  email: string;
  avatarUrl: string | null;
  provider: string | null;
  memberSince: string | null;
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <section className="rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <div className="flex items-center gap-3.5 px-[18px] py-4">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-11 w-11 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent font-mono text-[16px] font-semibold text-accent-foreground">
            {(name ?? email).slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-semibold text-foreground">
            {name ?? email.split("@")[0]}
          </p>
          <p className="truncate text-[12.5px] text-muted-foreground">{email}</p>
        </div>
        {provider && (
          <span className="rounded-full border border-border bg-secondary px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[.5px] text-muted-foreground">
            {provider}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-border/60 px-[18px] py-3">
        <p className="text-[12px] text-muted-foreground">
          {memberSince ? `Member since ${memberSince}` : "Signed in"}
        </p>
        <button
          onClick={signOut}
          disabled={signingOut}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[12.5px] font-semibold text-danger hover:bg-danger/5 disabled:opacity-60"
        >
          <SignOut size={14} /> {signingOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </section>
  );
}
