import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { createAdminClient } from "@/utils/supabase/admin";
import { shareCookieName, shareCookieValue, type ShareRow } from "@/lib/analytics/share";
import { PublicShell } from "@/components/share/public-shell";
import { PasswordGate } from "@/components/share/password-gate";

type Loaded = { share: ShareRow; site: { public_id: string; name: string; domains: string[] } };

async function load(token: string): Promise<Loaded | null> {
  const admin = createAdminClient();
  const { data: share } = await admin.from("share_tokens").select("*").eq("token", token).maybeSingle<ShareRow>();
  if (!share) return null;
  const { data: site } = await admin
    .from("sites")
    .select("public_id, name, domains")
    .eq("id", share.site_id)
    .maybeSingle<{ public_id: string; name: string; domains: string[] }>();
  if (!site) return null;
  // Note the visit (best-effort) so owners can spot unexpected traffic.
  admin.from("share_tokens").update({ last_accessed_at: new Date().toISOString() }).eq("token", token).then(() => {});
  return { share, site };
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const loaded = await load(token);
  if (!loaded) return { title: "Not found" };
  return {
    title: `${loaded.site.name} — Analytics`,
    // Secret links stay out of search indexes; public links may be indexed.
    robots: loaded.share.visibility === "public" ? undefined : { index: false, follow: false },
  };
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const loaded = await load(token);
  if (!loaded) notFound();
  const { share, site } = loaded;

  if (share.password_hash) {
    const cookie = (await cookies()).get(shareCookieName(token))?.value;
    if (cookie !== shareCookieValue(share.password_hash, token)) {
      return <PasswordGate token={token} siteName={site.name} />;
    }
  }

  return (
    <PublicShell
      token={token}
      publicId={site.public_id}
      siteName={site.name}
      domain={site.domains?.[0] ?? null}
      exposedScreens={Array.isArray(share.exposed_screens) ? share.exposed_screens : ["overview"]}
    />
  );
}
