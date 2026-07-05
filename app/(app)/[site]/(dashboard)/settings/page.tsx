import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { CopySnippet } from "@/components/dashboard/copy-snippet";

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
    .select("public_id, name, domains, privacy_mode, timezone, created_at")
    .eq("public_id", publicId)
    .maybeSingle();
  if (!site) notFound();

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://websight.srexrg.me";
  const snippet = `<script defer src="${origin}/t.js" data-site="${site.domains[0] ?? site.public_id}"></script>`;

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <section className="rounded-2xl border border-border bg-card px-[18px] py-2 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
        <h3 className="pb-1 pt-3 text-[14.5px] font-semibold text-foreground">Site details</h3>
        <Field label="Name">{site.name}</Field>
        <Field label="Domains">{site.domains.join(", ")}</Field>
        <Field label="Site ID">{site.public_id}</Field>
        <Field label="Privacy mode">{site.privacy_mode}</Field>
        <Field label="Timezone">{site.timezone}</Field>
      </section>

      <section className="rounded-2xl border border-border bg-card px-[18px] pb-4 pt-3 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
        <h3 className="pb-2 text-[14.5px] font-semibold text-foreground">Tracking snippet</h3>
        <p className="pb-3 text-[12.5px] leading-relaxed text-muted-foreground">
          Paste this inside your site&apos;s <code className="font-mono">&lt;head&gt;</code>. Custom
          events: <code className="font-mono">websight.track(&quot;signup&quot;)</code> or{" "}
          <code className="font-mono">data-ws-event</code> attributes.
        </p>
        <CopySnippet code={snippet} />
      </section>
    </div>
  );
}
