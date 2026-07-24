"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  ArrowRight,
  Fingerprint,
  Globe,
  ShieldCheck,
} from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createSiteOnboarding } from "@/app/(app)/dashboard/actions";
import { normalizeSiteKey } from "@/lib/analytics/sites";

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

type Step = "form" | "install";

export function AddSiteDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}) {
  const [step, setStep] = useState<Step>("form");
  const [domain, setDomain] = useState("");
  const [privacy, setPrivacy] = useState<"stateless" | "persistent">("stateless");
  const [publicId, setPublicId] = useState<string | null>(null);
  const [createdDomain, setCreatedDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  function reset() {
    setStep("form");
    setDomain("");
    setPrivacy("stateless");
    setPublicId(null);
    setCreatedDomain("");
    setError(null);
    setCopied(false);
  }

  // Reset internal state whenever the dialog transitions from open to closed
  // (covers the close button, Escape, and overlay clicks).
  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function submitSite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const tz =
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : "UTC";
    start(async () => {
      const res = await createSiteOnboarding({
        domain,
        timezone: tz,
        privacyMode: privacy,
      });
      if (res.error) setError(res.error);
      else if (res.publicId) {
        setPublicId(res.publicId);
        setCreatedDomain(normalizeSiteKey(domain) ?? domain.trim());
        setStep("install");
        onCreated?.();
      }
    });
  }

  const modeAttr = privacy === "persistent" ? ` data-mode="persistent"` : "";
  const snippet = `<script defer src="https://websight.srexrg.me/t.js" data-site="${createdDomain}"${modeAttr}></script>`;

  function handleCopy() {
    navigator.clipboard
      .writeText(snippet)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        {step === "form" ? (
          <form onSubmit={submitSite}>
            <DialogHeader>
              <DialogTitle>Add a site</DialogTitle>
              <DialogDescription>
                Tell us where to track. It only takes a moment.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5">
              <label
                htmlFor="add-site-domain"
                className="mb-1.5 block text-[12.5px] font-semibold text-foreground"
              >
                Your website domain
              </label>
              <div className="relative">
                <Globe
                  size={17}
                  weight="bold"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  id="add-site-domain"
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

              <span className="mb-2 mt-5 block text-[12.5px] font-semibold text-foreground">
                Privacy mode
              </span>
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
                        name="add-site-privacy"
                        checked={selected}
                        onChange={() => setPrivacy(m.key)}
                        className="sr-only"
                      />
                      <div className="flex items-center justify-between">
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                            selected
                              ? "bg-brand text-white"
                              : "bg-secondary text-muted-foreground group-hover:text-brand"
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
                      <span className="mt-2.5 block text-[13.5px] font-semibold text-foreground">
                        {m.title}
                      </span>
                      <span className="mt-1 block text-[11.5px] leading-relaxed text-muted-foreground">
                        {m.desc}
                      </span>
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
                {pending ? "Adding…" : "Add site"}
                {!pending && <ArrowRight size={15} weight="bold" />}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <DialogHeader>
              <DialogTitle>You&apos;re all set - add the snippet</DialogTitle>
              <DialogDescription>
                Drop this one line in your &lt;head&gt;. No build step, no
                cookie banner.
              </DialogDescription>
            </DialogHeader>

            {/* Dark code block (mirrors landing/Install.tsx) */}
            <div className="relative mt-5 rounded-[14px] bg-[#0E1310] px-[22px] py-5 font-mono text-[13px] leading-[1.7] text-[#C9CBD6] shadow-[0_18px_50px_-22px_rgba(14,156,110,0.4)] ring-1 ring-white/[0.07]">
              <div className="overflow-x-auto pr-[70px]">
                <span className="text-[#6B6E7B]">&lt;</span>
                <span className="text-[#E06C9B]">script</span>
                <span> </span>
                <span className="text-[#5FD3A6]">defer</span>
                <span> </span>
                <span className="text-[#5FD3A6]">src</span>
                <span className="text-[#6B6E7B]">=</span>
                <span className="text-[#5BE5A8]">
                  &quot;https://websight.srexrg.me/t.js&quot;
                </span>
                <span> </span>
                <span className="text-[#5FD3A6]">data-site</span>
                <span className="text-[#6B6E7B]">=</span>
                <span className="text-[#5BE5A8]">&quot;{createdDomain}&quot;</span>
                {privacy === "persistent" && (
                  <>
                    <span> </span>
                    <span className="text-[#5FD3A6]">data-mode</span>
                    <span className="text-[#6B6E7B]">=</span>
                    <span className="text-[#5BE5A8]">&quot;persistent&quot;</span>
                  </>
                )}
                <span className="text-[#6B6E7B]">&gt;&lt;/</span>
                <span className="text-[#E06C9B]">script</span>
                <span className="text-[#6B6E7B]">&gt;</span>
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="absolute right-[14px] top-[14px] flex cursor-pointer items-center gap-[5px] rounded-[8px] bg-[#1E2420] px-[11px] py-[6px] font-sans text-[12px] font-semibold text-[#C9CBD6] transition-colors hover:bg-brand hover:text-white"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 256 256"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z" />
                </svg>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={reset}
                className="text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Add another
              </button>
              {publicId && (
                <Link
                  href={`/${publicId}/overview`}
                  className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_2px_8px_rgba(14,156,110,.30)] transition-all hover:bg-brand/90"
                >
                  Open dashboard <ArrowRight size={14} weight="bold" />
                </Link>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
