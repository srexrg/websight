import Link from "next/link";

/**
 * Enable / configure explainer for Replays (docs/redesign/24), in the
 * RetentionLocked pattern. Two ways in: the instance has no object store wired
 * up (self-host config), or recording is simply switched off for this site
 * (owner flips it in Settings). Only shown when no recordings exist yet.
 */
export function ReplaysLocked({
  site,
  storageConfigured,
}: {
  site: string;
  storageConfigured: boolean;
}) {
  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-border bg-card p-8 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <div className="max-w-md text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-[20px]">
          🎬
        </span>
        <h2 className="mt-3 text-[16px] font-semibold text-foreground">
          {storageConfigured ? "Session replay is off" : "Session replay needs storage"}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Replay records a visual reproduction of visitor sessions from DOM snapshots, sampled and
          masked, so you can watch how people actually move through your site.
        </p>
        {storageConfigured ? (
          <>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              Recording is turned off for this site. Turn it on in settings, set a sample rate, and
              recordings land here as sampled visits come in.
            </p>
            <Link
              href={`/${site}/settings`}
              className="mt-4 inline-block rounded-md bg-brand px-3 py-1.5 text-[13px] font-medium text-brand-foreground hover:opacity-90"
            >
              Enable it in Settings
            </Link>
          </>
        ) : (
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            No object store is configured on this instance. Set the{" "}
            <code className="rounded bg-secondary px-1 font-mono text-[12px] text-foreground">
              REPLAY_S3_*
            </code>{" "}
            environment variables to point at Cloudflare R2, MinIO, AWS S3, or Supabase Storage to
            store recordings, then replay unlocks.
          </p>
        )}
      </div>
    </div>
  );
}
