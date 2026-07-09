"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Fingerprint,
  Globe,
  ShieldCheck,
} from "@phosphor-icons/react";
import { createSiteOnboarding } from "@/app/(app)/dashboard/actions";
import { BrandSplit } from "@/components/onboarding/brand-split";
import { InstallTabs } from "@/components/onboarding/install-tabs";
import { VerifyCard } from "@/components/onboarding/verify-card";

type Step = "site" | "install" | "verify";
const STEPS: { key: Step; label: string }[] = [
  { key: "site", label: "Set up" },
  { key: "install", label: "Install" },
  { key: "verify", label: "Verify" },
];

function Stepper({ current }: { current: Step }) {
  const active = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="mb-8 flex items-center">
      {STEPS.map((s, n) => {
        const done = n < active;
        const isActive = n === active;
        return (
          <div key={s.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-[12px] font-semibold transition-all duration-300 ${
                  done
                    ? "bg-brand text-white"
                    : isActive
                      ? "bg-brand text-white shadow-[0_0_0_4px_rgba(14,156,110,.16)]"
                      : "border border-border bg-card text-muted-foreground"
                }`}
              >
                {done ? <Check size={14} weight="bold" /> : n + 1}
              </span>
              <span
                className={`text-[11.5px] font-medium transition-colors ${
                  isActive || done ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
            </div>
            {n < STEPS.length - 1 && (
              <span className="mx-2 -mt-5 h-[2px] flex-1 overflow-hidden rounded-full bg-border">
                <span
                  className="block h-full rounded-full bg-brand transition-all duration-500"
                  style={{ width: done ? "100%" : "0%" }}
                />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

const PRIVACY = [
  {
    key: "stateless" as const,
    icon: ShieldCheck,
    title: "Stateless",
    badge: "Recommended",
    desc: "No cookies, no cross-day identity. Fully anonymous, so no consent banner needed.",
  },
  {
    key: "persistent" as const,
    icon: Fingerprint,
    title: "Persistent",
    badge: null,
    desc: "A durable visitor id unlocks profiles and retention across days. A deliberate privacy trade-off.",
  },
];

export function OnboardingFlow({ firstSite }: { firstSite: boolean }) {
  const router = useRouter();
  const reduce = useReducedMotion();
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

  const heading =
    step === "site"
      ? { eyebrow: `Step 1 of 3`, title: firstSite ? "Set up your site" : "Add a site", sub: "Tell us where to track. This takes under three minutes." }
      : step === "install"
        ? { eyebrow: `Step 2 of 3`, title: "Add the snippet", sub: "One line in your <head>. No build step, no cookie banner." }
        : { eyebrow: `Step 3 of 3`, title: "Confirm it's live", sub: "We'll listen for your first pageview and echo it back." };

  const anim = reduce
    ? {}
    : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const } };

  return (
    <BrandSplit
      eyebrow={firstSite ? "Welcome aboard" : "New site"}
      title="Analytics that respect your visitors"
      subtitle="You're moments away from a live, privacy-first dashboard. Let's get the first visit flowing."
      ticks={["No cookies, ever", "Script under 1KB", "GDPR-free by default"]}
    >
      <Stepper current={step} />

      <div className="mb-6">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.8px] text-brand">
          {heading.eyebrow}
        </span>
        <h1 className="mt-2 text-[24px] font-bold tracking-[-0.5px] text-foreground">{heading.title}</h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">{heading.sub}</p>
      </div>

      <AnimatePresence mode="wait">
        {step === "site" && (
          <motion.form key="site" {...anim} onSubmit={submitSite}>
            <label htmlFor="ws-domain" className="mb-1.5 block text-[12.5px] font-semibold text-foreground">
              Your website domain
            </label>
            <div className="relative">
              <Globe size={17} weight="bold" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                id="ws-domain"
                autoFocus
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com"
                className="w-full rounded-lg border border-input bg-card py-2.5 pl-9 pr-3 text-[14.5px] text-foreground outline-none transition-shadow focus:border-brand focus:shadow-[0_0_0_3px_rgba(14,156,110,.14)]"
              />
            </div>
            <p className="mt-1.5 text-[11.5px] text-muted-foreground">
              We&apos;ll strip the protocol and www automatically.
            </p>

            <span className="mb-2 mt-5 block text-[12.5px] font-semibold text-foreground">Privacy mode</span>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {PRIVACY.map((m) => {
                const selected = privacy === m.key;
                const Icon = m.icon;
                return (
                  <label
                    key={m.key}
                    className={`group relative cursor-pointer rounded-xl border p-3.5 transition-all ${
                      selected
                        ? "border-brand bg-accent shadow-[0_0_0_3px_rgba(14,156,110,.12)]"
                        : "border-border bg-card hover:border-brand/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="privacy"
                      checked={selected}
                      onChange={() => setPrivacy(m.key)}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                          selected ? "bg-brand text-white" : "bg-secondary text-muted-foreground group-hover:text-brand"
                        }`}
                      >
                        <Icon size={17} weight="bold" />
                      </span>
                      {m.badge && (
                        <span className="rounded-full bg-brand/12 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.4px] text-brand">
                          {m.badge}
                        </span>
                      )}
                    </div>
                    <span className="mt-2.5 block text-[13.5px] font-semibold text-foreground">{m.title}</span>
                    <span className="mt-1 block text-[11.5px] leading-relaxed text-muted-foreground">{m.desc}</span>
                  </label>
                );
              })}
            </div>

            {error && <p className="mt-3 text-[12px] text-danger">{error}</p>}
            <button
              type="submit"
              disabled={pending || !domain.trim()}
              className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_2px_8px_rgba(14,156,110,.30)] transition-all hover:bg-brand/90 disabled:opacity-50 disabled:shadow-none"
            >
              {pending ? "Creating…" : "Continue"}
              {!pending && <ArrowRight size={15} weight="bold" />}
            </button>
          </motion.form>
        )}

        {step === "install" && publicId && (
          <motion.div key="install" {...anim}>
            <InstallTabs domain={domain} />
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => setStep("site")}
                className="flex items-center gap-1 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft size={14} weight="bold" /> Back
              </button>
              <button
                onClick={() => setStep("verify")}
                className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_2px_8px_rgba(14,156,110,.30)] transition-all hover:bg-brand/90"
              >
                I&apos;ve added it <ArrowRight size={14} weight="bold" />
              </button>
            </div>
          </motion.div>
        )}

        {step === "verify" && publicId && (
          <motion.div key="verify" {...anim}>
            <VerifyCard site={publicId} onVerified={() => router.push(`/${publicId}/overview`)} />
          </motion.div>
        )}
      </AnimatePresence>
    </BrandSplit>
  );
}
