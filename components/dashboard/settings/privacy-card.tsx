"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Fingerprint, ShieldCheck, Warning } from "@phosphor-icons/react";

export type PrivacyMode = "stateless" | "persistent";

const MODES = [
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

/**
 * Change a site's privacy mode after creation. The mode decides how visitor
 * identity is resolved on ingest, so switching only affects traffic from here
 * on: history keeps whichever ids it was recorded with. Persistent also needs
 * `data-mode="persistent"` on the snippet, which the install card above picks
 * up on refresh.
 */
export function PrivacyCard({ site, initial }: { site: string; initial: PrivacyMode }) {
  const router = useRouter();
  const [mode, setMode] = useState<PrivacyMode>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(next: PrivacyMode) {
    if (next === mode || busy) return;
    const previous = mode;
    setMode(next);
    setBusy(true);
    setError(false);
    setSaved(false);
    try {
      const res = await fetch(`/api/sites/${site}/settings`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ privacy_mode: next }),
      });
      if (!res.ok) throw new Error("save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh(); // so the install snippet re-renders with the new mode
    } catch {
      setMode(previous);
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card px-[18px] pb-4 pt-3 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <div className="flex items-start justify-between gap-3 pb-1">
        <h3 className="text-[14.5px] font-semibold text-foreground">Privacy mode</h3>
        <div className="flex items-center gap-2 pt-0.5 text-[11px]">
          {busy && <span className="text-muted-foreground">Saving…</span>}
          {saved && !busy && <span className="text-brand">Saved</span>}
        </div>
      </div>
      <p className="pb-3 text-[12.5px] leading-relaxed text-muted-foreground">
        How a visitor is identified on ingest. Switching applies to new traffic only - visits
        already recorded keep the ids they were counted with, so cross-day metrics take a while to
        settle after a change.
      </p>

      {error && (
        <div className="mb-3 flex items-center gap-1.5 rounded-md border border-danger/40 bg-danger/10 px-2.5 py-1.5 text-[12px] text-danger">
          <Warning size={14} weight="fill" />
          Could not save that change. It was reverted, please try again.
        </div>
      )}

      <div className="grid gap-2.5 sm:grid-cols-2">
        {MODES.map((m) => {
          const selected = mode === m.key;
          const Icon = m.icon;
          return (
            <label
              key={m.key}
              className={`group relative rounded-xl border p-3.5 transition-all ${
                busy ? "cursor-not-allowed opacity-60" : "cursor-pointer"
              } ${
                selected
                  ? "border-brand bg-accent shadow-[0_0_0_3px_rgba(14,156,110,.12)]"
                  : "border-border bg-card hover:border-brand/40"
              }`}
            >
              <input
                type="radio"
                name="site-privacy-mode"
                checked={selected}
                disabled={busy}
                onChange={() => save(m.key)}
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

      {mode === "persistent" && (
        <p className="mt-3 text-[11.5px] leading-relaxed text-muted-foreground">
          Persistent mode needs <code className="font-mono">data-mode=&quot;persistent&quot;</code>{" "}
          on your snippet. The installation card above already includes it - re-copy it to your
          site.
        </p>
      )}
    </section>
  );
}
