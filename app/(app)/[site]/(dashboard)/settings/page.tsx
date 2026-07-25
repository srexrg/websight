import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { InstallTabs } from "@/components/onboarding/install-tabs";
import { ShareSettingsCard } from "@/components/share/share-settings-card";
import { ReplayCard } from "@/components/dashboard/settings/replay-card";
import { PrivacyCard } from "@/components/dashboard/settings/privacy-card";
import { replayStorageConfigured } from "@/lib/replay/storage";

export const metadata = { title: "Site Settings" };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border/60 py-3 last:border-b-0 sm:flex-row sm:items-center">
      <span className="w-44 shrink-0 text-[12.5px] font-medium text-muted-foreground">{label}</span>
      <span className="font-mono text-[13px] text-foreground">{children}</span>
    </div>
  );
}

export default async function SiteSettingsPage({ params }: { params: Promise<{ site: string }> }) {
  const { site: publicId } = await params;
  const supabase = await createClient();
  const { data: site } = await supabase
    .from("sites")
    .select("id, public_id, name, domains, privacy_mode, timezone, created_at, settings")
    .eq("public_id", publicId)
    .maybeSingle();
  if (!site) notFound();

  const privacyMode = site.privacy_mode === "persistent" ? "persistent" : "stateless";
  const settings = (site.settings as Record<string, unknown> | null) ?? {};
  const sampleRaw = Number(settings.replay_sample_rate);
  const retentionRaw = Number(settings.replay_retention_days);
  const replayInitial = {
    enabled: settings.replay_enabled === true,
    sampleRate: sampleRaw >= 0 && sampleRaw <= 1 ? sampleRaw : 1,
    maskText: settings.replay_mask_text === true,
    retentionDays: Number.isFinite(retentionRaw) && retentionRaw > 0 ? retentionRaw : 30,
  };

  // Storage usage: count of non-expired recordings and their total bytes.
  // The table may not exist yet in local dev, so fall back to zeros silently.
  let replayUsage = { recordings: 0, bytes: 0 };
  try {
    const admin = createAdminClient();
    const { data: rows, count } = await admin
      .from("replay_recordings")
      .select("bytes", { count: "exact" })
      .eq("site_id", site.id)
      .neq("status", "expired")
      .limit(10000);
    if (rows) {
      const bytes = rows.reduce((sum, r) => sum + (Number((r as { bytes: number }).bytes) || 0), 0);
      replayUsage = { recordings: count ?? rows.length, bytes };
    }
  } catch {
    replayUsage = { recordings: 0, bytes: 0 };
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <section className="rounded-2xl border border-border bg-card px-[18px] py-2 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
        <h3 className="pb-1 pt-3 text-[14.5px] font-semibold text-foreground">Site details</h3>
        <Field label="Name">{site.name}</Field>
        <Field label="Domains">{site.domains.join(", ")}</Field>
        <Field label="Site ID">{site.public_id}</Field>
        <Field label="Timezone">{site.timezone}</Field>
      </section>

      <section className="rounded-2xl border border-border bg-card px-[18px] pb-4 pt-3 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
        <h3 className="pb-2 text-[14.5px] font-semibold text-foreground">Installation</h3>
        <p className="pb-3 text-[12.5px] leading-relaxed text-muted-foreground">
          Paste this inside your site&apos;s <code className="font-mono">&lt;head&gt;</code>. Custom
          events: <code className="font-mono">websight.track(&quot;signup&quot;)</code> or{" "}
          <code className="font-mono">data-ws-event</code> attributes.
        </p>
        <InstallTabs domain={site.domains[0] ?? site.public_id} mode={privacyMode} />
      </section>

      <PrivacyCard site={site.public_id} initial={privacyMode} />

      <ReplayCard
        site={site.public_id}
        initial={replayInitial}
        usage={replayUsage}
        storageConfigured={replayStorageConfigured()}
      />

      <ShareSettingsCard site={site.public_id} />
    </div>
  );
}
