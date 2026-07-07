"use client";

import { useEffect, useState } from "react";
import { CopySnippet } from "@/components/dashboard/copy-snippet";
import { formatRelativeTime } from "@/lib/dashboard/format";

type ShareConfig = {
  token: string;
  visibility: "secret" | "public";
  exposed_screens: string[];
  hide_events: boolean;
  has_password: boolean;
  last_accessed_at: string | null;
};

const EXPOSABLE = [
  { key: "realtime", label: "Realtime" },
  { key: "globe", label: "Globe" },
  { key: "pages", label: "Pages" },
  { key: "sources", label: "Sources" },
  { key: "audience", label: "Audience" },
];

export function ShareSettingsCard({ site }: { site: string }) {
  const [config, setConfig] = useState<ShareConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [origin] = useState(() => (typeof window !== "undefined" ? window.location.origin : ""));

  useEffect(() => {
    fetch(`/api/sites/${site}/share`)
      .then((r) => r.json())
      .then((d) => setConfig(d.share))
      .finally(() => setLoading(false));
  }, [site]);

  async function call(method: string, body?: unknown) {
    setBusy(true);
    const res = await fetch(`/api/sites/${site}/share`, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = method === "DELETE" ? null : await res.json().catch(() => null);
    setBusy(false);
    return data?.share as ShareConfig | undefined;
  }

  async function enable() {
    const s = await call("POST", { visibility: "secret", exposed_screens: [], hide_events: true });
    if (s) setConfig(s);
  }
  async function patch(body: Record<string, unknown>) {
    const s = await call("PATCH", body);
    if (s) setConfig(s);
  }
  async function disable() {
    await call("DELETE");
    setConfig(null);
  }

  function toggleScreen(key: string) {
    if (!config) return;
    const next = config.exposed_screens.includes(key)
      ? config.exposed_screens.filter((s) => s !== key)
      : [...config.exposed_screens, key];
    patch({ exposed_screens: next });
  }

  const url = config ? `${origin}/share/${config.token}` : "";
  const embed = config
    ? `<script src="${origin}/embed.js" data-share="${config.token}"></script>`
    : "";

  return (
    <section className="rounded-2xl border border-border bg-card px-[18px] pb-4 pt-3 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <h3 className="pb-1 text-[14.5px] font-semibold text-foreground">Public sharing</h3>
      <p className="pb-3 text-[12.5px] leading-relaxed text-muted-foreground">
        Publish a read-only dashboard at a shareable link. Anyone with the link can see traffic,
        top pages, and sources for the screens you choose.
      </p>

      {loading ? (
        <div className="h-10 animate-pulse rounded-md bg-secondary" />
      ) : !config ? (
        <button
          onClick={enable}
          disabled={busy}
          className="rounded-md bg-brand px-3 py-1.5 text-[13px] font-medium text-brand-foreground hover:opacity-90 disabled:opacity-60"
        >
          Enable sharing
        </button>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-[11.5px] font-medium text-muted-foreground">Share link</label>
            <CopySnippet code={url} />
            {config.last_accessed_at && (
              <p className="mt-1 text-[11px] text-muted-foreground">Last viewed {formatRelativeTime(config.last_accessed_at)}.</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-muted-foreground">Visibility</span>
            <div className="flex rounded-md bg-secondary p-0.5">
              {(["secret", "public"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => patch({ visibility: v })}
                  className={`rounded px-2.5 py-0.5 text-[11.5px] font-semibold transition-colors ${
                    config.visibility === v ? "bg-card text-foreground shadow-[0_1px_2px_rgba(16,24,40,.06)]" : "text-muted-foreground"
                  }`}
                >
                  {v === "secret" ? "Unlisted" : "Public"}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-muted-foreground/70">
              {config.visibility === "secret" ? "Not indexed by search engines." : "May be indexed."}
            </span>
          </div>

          <div>
            <span className="mb-1.5 block text-[12px] text-muted-foreground">Exposed screens (Overview always shown)</span>
            <div className="flex flex-wrap gap-1.5">
              {EXPOSABLE.map((s) => {
                const on = config.exposed_screens.includes(s.key);
                return (
                  <button
                    key={s.key}
                    onClick={() => toggleScreen(s.key)}
                    disabled={busy}
                    className={`rounded-full border px-2.5 py-1 text-[12px] transition-colors ${
                      on ? "border-brand bg-brand/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 text-[12.5px] text-foreground">
            <input type="checkbox" checked={config.hide_events} onChange={(e) => patch({ hide_events: e.target.checked })} />
            Hide custom events & goals (business-sensitive)
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={config.has_password ? "Change password…" : "Set a password (optional)"}
              className="w-56 rounded-md border border-input bg-transparent px-2 py-1 text-[12.5px] text-foreground outline-none focus:border-ring"
            />
            <button
              onClick={() => { patch({ password }); setPassword(""); }}
              disabled={busy || !password}
              className="rounded-md border border-border px-2.5 py-1 text-[12px] text-foreground hover:bg-secondary disabled:opacity-50"
            >
              {config.has_password ? "Update" : "Set"}
            </button>
            {config.has_password && (
              <button
                onClick={() => patch({ password: "" })}
                disabled={busy}
                className="text-[12px] text-muted-foreground hover:text-foreground"
              >
                Remove password
              </button>
            )}
          </div>

          <div>
            <label className="mb-1 block text-[11.5px] font-medium text-muted-foreground">Embed a live-visitors badge</label>
            <CopySnippet code={embed} />
          </div>

          <div className="flex flex-wrap gap-3 border-t border-border/60 pt-3">
            <button onClick={() => patch({ rotate: true })} disabled={busy} className="text-[12.5px] text-muted-foreground hover:text-foreground">
              Rotate link (invalidates the old URL)
            </button>
            <button onClick={disable} disabled={busy} className="text-[12.5px] text-danger hover:opacity-80">
              Stop sharing
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
