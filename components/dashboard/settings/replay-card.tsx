"use client";

import { useState } from "react";
import Link from "next/link";
import { Warning } from "@phosphor-icons/react";
import { CopySnippet } from "@/components/dashboard/copy-snippet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ReplaySettings = {
  enabled: boolean;
  sampleRate: number; // 0..1
  maskText: boolean;
  retentionDays: number;
};

type Usage = { recordings: number; bytes: number };

const SAMPLE_STEPS = [5, 10, 25, 50, 100];
const RETENTION_STEPS = [7, 14, 30, 60, 90];

function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? "bg-brand" : "bg-secondary"
      }`}
    >
      <span
        className={`inline-block h-[18px] w-[18px] rounded-full bg-white shadow-[0_1px_2px_rgba(16,24,40,.2)] transition-transform ${
          checked ? "translate-x-[18px]" : "translate-x-[2px]"
        }`}
      />
    </button>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

export function ReplayCard({
  site,
  initial,
  usage,
  storageConfigured,
}: {
  site: string;
  initial: ReplaySettings;
  usage: Usage;
  storageConfigured: boolean;
}) {
  const [settings, setSettings] = useState<ReplaySettings>(initial);
  const [origin] = useState(() =>
    typeof window !== "undefined" ? window.location.origin : "https://websight.srexrg.me",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Map friendly keys to the settings PATCH contract.
  function toPayload(partial: Partial<ReplaySettings>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if ("enabled" in partial) out.replay_enabled = partial.enabled;
    if ("sampleRate" in partial) out.replay_sample_rate = partial.sampleRate;
    if ("maskText" in partial) out.replay_mask_text = partial.maskText;
    if ("retentionDays" in partial) out.replay_retention_days = partial.retentionDays;
    return out;
  }

  async function patch(partial: Partial<ReplaySettings>) {
    const previous = settings;
    setSettings({ ...settings, ...partial });
    setBusy(true);
    setError(false);
    setSaved(false);
    try {
      const res = await fetch(`/api/sites/${site}/settings`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(toPayload(partial)),
      });
      if (!res.ok) throw new Error("save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSettings(previous);
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  function onToggleEnabled(next: boolean) {
    if (next && !settings.enabled) {
      // Off -> on always passes through the consent dialog first.
      setConfirmOpen(true);
      return;
    }
    patch({ enabled: next });
  }

  const percent = Math.round(settings.sampleRate * 100);
  const snippet = `<script defer src="${origin}/t.js" data-site="${site}" data-replay></script>`;

  if (!storageConfigured) {
    return (
      <section className="rounded-2xl border border-border bg-card px-[18px] pb-4 pt-3 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
        <h3 className="pb-1 text-[14.5px] font-semibold text-foreground">Session replay</h3>
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          Replay stores recordings in an S3-compatible object store, and none is configured on this
          instance. Set the <code className="font-mono">REPLAY_S3_*</code> environment variables to
          point at Cloudflare R2, MinIO, AWS S3, or Supabase Storage, then this card unlocks. See{" "}
          <Link
            href="/docs/dashboard/replays#self-hosting"
            className="text-brand underline underline-offset-2 hover:opacity-80"
          >
            the self-hosting docs
          </Link>{" "}
          for the full list.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card px-[18px] pb-4 pt-3 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <div className="flex items-start justify-between gap-3 pb-1">
        <h3 className="text-[14.5px] font-semibold text-foreground">Session replay</h3>
        <div className="flex items-center gap-2 pt-0.5">
          {busy && <span className="text-[11px] text-muted-foreground">Saving…</span>}
          {saved && !busy && <span className="text-[11px] text-brand">Saved</span>}
          <Toggle
            checked={settings.enabled}
            disabled={busy}
            onChange={onToggleEnabled}
            label="Enable session replay"
          />
        </div>
      </div>
      <p className="pb-3 text-[12.5px] leading-relaxed text-muted-foreground">
        Record a visual reproduction of visitor sessions from DOM snapshots, sampled and masked, so
        you can watch how people actually move through your site. Off by default. Unlike the rest of
        WebSight, recording captures real behavior, so read the note before you turn it on.
      </p>

      {error && (
        <div className="mb-3 flex items-center gap-1.5 rounded-md border border-danger/40 bg-danger/10 px-2.5 py-1.5 text-[12px] text-danger">
          <Warning size={14} weight="fill" />
          Could not save that change. It was reverted, please try again.
        </div>
      )}

      {settings.enabled && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <label className="block text-[12.5px] font-medium text-foreground">Sample rate</label>
              <p className="text-[11.5px] text-muted-foreground">
                Share of page loads chosen for recording. The decision is made once per visit.
              </p>
            </div>
            <Select
              value={String(percent)}
              disabled={busy}
              onValueChange={(v) => patch({ sampleRate: Number(v) / 100 })}
            >
              <SelectTrigger className="w-28 font-mono text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SAMPLE_STEPS.map((s) => (
                  <SelectItem key={s} value={String(s)} className="font-mono">
                    {s}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-start justify-between gap-3 border-t border-border/60 pt-3">
            <div>
              <label className="block text-[12.5px] font-medium text-foreground">Mask all text</label>
              <p className="text-[11.5px] text-muted-foreground">
                Replace every text node with blocks. Input fields are always masked regardless of
                this setting.
              </p>
            </div>
            <Toggle
              checked={settings.maskText}
              disabled={busy}
              onChange={(v) => patch({ maskText: v })}
              label="Mask all text"
            />
          </div>

          <div className="flex flex-col gap-1 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <label className="block text-[12.5px] font-medium text-foreground">Retention</label>
              <p className="text-[11.5px] text-muted-foreground">
                Expired recordings are deleted permanently, both the metadata and the stored
                snapshots.
              </p>
            </div>
            <Select
              value={String(settings.retentionDays)}
              disabled={busy}
              onValueChange={(v) => patch({ retentionDays: Number(v) })}
            >
              <SelectTrigger className="w-32 font-mono text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RETENTION_STEPS.map((d) => (
                  <SelectItem key={d} value={String(d)} className="font-mono">
                    {d} days
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border-t border-border/60 pt-3">
            {usage.recordings === 0 ? (
              <p className="text-[12px] text-muted-foreground">
                No recordings stored yet. They appear once sampled visits come in.
              </p>
            ) : (
              <p className="text-[12px] text-muted-foreground">
                <span className="font-mono text-foreground">
                  {usage.recordings.toLocaleString()}
                </span>{" "}
                {usage.recordings === 1 ? "recording" : "recordings"} stored -{" "}
                <span className="font-mono text-foreground">{formatBytes(usage.bytes)}</span>
              </p>
            )}
          </div>

          <div className="border-t border-border/60 pt-3">
            <label className="mb-1 block text-[11.5px] font-medium text-muted-foreground">
              Add <code className="font-mono">data-replay</code> to the snippet so the recorder loads
            </label>
            <CopySnippet code={snippet} />
          </div>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Turn on session replay</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 text-[13px] leading-relaxed text-muted-foreground">
            <p>
              Recording captures a visual reproduction of visitor sessions from DOM snapshots. Every
              input field is masked by default, and you can hide any element by adding{" "}
              <code className="font-mono text-foreground">data-ws-mask</code> to it.
            </p>
            <p>
              This is the one part of WebSight that records real user behavior. Under the GDPR and
              the ePrivacy directive, session recording may require visitor consent even though
              WebSight&apos;s analytics on its own does not. WebSight&apos;s cookieless, no-banner
              posture does not extend to replay. Deciding whether you need consent is your call, and
              your counsel&apos;s.
            </p>
            <p>
              The{" "}
              <a
                href="/docs/dashboard/replays"
                target="_blank"
                rel="noreferrer"
                className="text-brand underline underline-offset-2 hover:opacity-80"
              >
                replay documentation
              </a>{" "}
              covers masking, retention, and deletion in full.
            </p>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="rounded-md border border-border px-3 py-1.5 text-[13px] text-foreground hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmOpen(false);
                patch({ enabled: true });
              }}
              className="rounded-md bg-brand px-3 py-1.5 text-[13px] font-medium text-brand-foreground hover:opacity-90"
            >
              Enable recording
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
