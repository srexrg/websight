"use client";

import { useState } from "react";
import { ArrowsClockwise, Check, Copy, Key } from "@phosphor-icons/react";
import { createClient } from "@/utils/supabase/client";
import { CopySnippet } from "./copy-snippet";

/** Account API key for POST /api/events (server-side custom events). */
export function ApiKeyCard({ userId, initialApiKey }: { userId: string; initialApiKey: string }) {
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const key = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const { error: err } = await createClient().from("users").update({ api: key }).eq("id", userId);
      if (err) throw err;
      setApiKey(key);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate key");
    } finally {
      setBusy(false);
    }
  };

  const usage = `curl -X POST ${process.env.NEXT_PUBLIC_APP_URL ?? "https://websight.srexrg.me"}/api/events \\
  -H "Authorization: Bearer ${apiKey || "<your-api-key>"}" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "purchase", "domain": "your-domain.com", "description": "42 EUR"}'`;

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-border bg-card px-[18px] pb-4 pt-3 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
        <div className="flex items-center gap-2 pb-1">
          <Key size={16} className="text-accent-foreground" />
          <h3 className="text-[14.5px] font-semibold text-foreground">API key</h3>
        </div>
        <p className="pb-3 text-[12.5px] leading-relaxed text-muted-foreground">
          Send custom events from your backend with this key. Regenerating invalidates the old
          key immediately.
        </p>
        {apiKey ? (
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-secondary px-3 py-2 font-mono text-[12.5px] text-foreground">
              {apiKey}
            </code>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(apiKey);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:text-foreground"
              aria-label="Copy API key"
            >
              {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
            </button>
            <button
              onClick={generate}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-[12.5px] font-semibold text-foreground hover:bg-secondary disabled:opacity-60"
            >
              <ArrowsClockwise size={14} className={busy ? "animate-spin" : ""} /> Regenerate
            </button>
          </div>
        ) : (
          <button
            onClick={generate}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[#0B7E58] disabled:opacity-60"
          >
            <Key size={14} /> {busy ? "Generating..." : "Generate API key"}
          </button>
        )}
        {error && <p className="pt-2 text-[12.5px] font-medium text-danger">{error}</p>}
      </section>

      {apiKey && (
        <section className="rounded-2xl border border-border bg-card px-[18px] pb-4 pt-3 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
          <h3 className="pb-2 text-[14.5px] font-semibold text-foreground">Usage</h3>
          <CopySnippet code={usage} />
        </section>
      )}
    </div>
  );
}
