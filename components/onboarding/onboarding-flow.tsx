"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSiteOnboarding } from "@/app/(app)/dashboard/actions";
import { InstallTabs } from "@/components/onboarding/install-tabs";
import { VerifyCard } from "@/components/onboarding/verify-card";

type Step = "site" | "install" | "verify";
const STEPS: Step[] = ["site", "install", "verify"];

function Dots({ step }: { step: Step }) {
  const i = STEPS.indexOf(step);
  return (
    <div className="flex justify-center gap-1.5 pb-6">
      {STEPS.map((s, n) => (
        <span key={s} className={`h-1.5 rounded-full transition-all ${n === i ? "w-6 bg-brand" : n < i ? "w-1.5 bg-brand/50" : "w-1.5 bg-border"}`} />
      ))}
    </div>
  );
}

export function OnboardingFlow({ firstSite }: { firstSite: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("site");
  const [domain, setDomain] = useState("");
  const [privacy, setPrivacy] = useState<"stateless" | "persistent">("stateless");
  const [publicId, setPublicId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submitSite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const tz = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
    start(async () => {
      const res = await createSiteOnboarding({ domain, timezone: tz, privacyMode: privacy });
      if (res.error) setError(res.error);
      else if (res.publicId) {
        setPublicId(res.publicId);
        setStep("install");
      }
    });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <h1 className="text-[22px] font-bold tracking-[-.4px] text-foreground">
          {firstSite ? "Welcome to WebSight" : "Add a site"}
        </h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">
          {step === "site" && "Let's get your first site tracking in under three minutes."}
          {step === "install" && "Add the snippet to your site."}
          {step === "verify" && "Almost there - let's confirm it's working."}
        </p>
      </div>
      <Dots step={step} />

      {step === "site" && (
        <form onSubmit={submitSite} className="rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
          <label className="mb-1 block text-[12.5px] font-medium text-foreground">Your website domain</label>
          <input
            autoFocus
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="example.com"
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-[14px] text-foreground outline-none focus:border-ring"
          />
          <p className="mt-1 text-[11.5px] text-muted-foreground">We&apos;ll strip the protocol and www automatically.</p>

          <div className="mt-4">
            <span className="mb-1.5 block text-[12.5px] font-medium text-foreground">Privacy mode</span>
            {(["stateless", "persistent"] as const).map((m) => (
              <label key={m} className="mb-1.5 flex cursor-pointer items-start gap-2 rounded-lg border border-border p-2.5 has-[:checked]:border-brand">
                <input type="radio" name="privacy" checked={privacy === m} onChange={() => setPrivacy(m)} className="mt-0.5" />
                <span>
                  <span className="block text-[13px] font-medium text-foreground">
                    {m === "stateless" ? "Stateless (recommended)" : "Persistent"}
                  </span>
                  <span className="block text-[11.5px] leading-relaxed text-muted-foreground">
                    {m === "stateless"
                      ? "No cookies, no cross-day identity. Fully anonymous - no consent banner needed."
                      : "A durable visitor id enables profiles & retention across days. A deliberate privacy trade-off."}
                  </span>
                </span>
              </label>
            ))}
          </div>

          {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}
          <button
            type="submit"
            disabled={pending || !domain.trim()}
            className="mt-4 w-full rounded-md bg-brand px-4 py-2 text-[13.5px] font-medium text-brand-foreground hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Creating…" : "Continue"}
          </button>
        </form>
      )}

      {step === "install" && publicId && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
          <InstallTabs domain={domain} />
          <div className="mt-5 flex items-center justify-between">
            <button onClick={() => setStep("site")} className="text-[12.5px] text-muted-foreground hover:text-foreground">← Back</button>
            <button onClick={() => setStep("verify")} className="rounded-md bg-brand px-4 py-2 text-[13px] font-medium text-brand-foreground hover:opacity-90">
              I&apos;ve added it →
            </button>
          </div>
        </div>
      )}

      {step === "verify" && publicId && (
        <VerifyCard site={publicId} onVerified={() => router.push(`/${publicId}/overview`)} />
      )}
    </div>
  );
}
