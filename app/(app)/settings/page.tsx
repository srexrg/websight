import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AppHeader } from "@/components/dashboard/app-header";
import { ApiKeyCard } from "@/components/dashboard/api-key-card";
import { ProfileCard } from "@/components/dashboard/settings/profile-card";
import { AppearanceCard } from "@/components/dashboard/settings/appearance-card";

export const metadata = { title: "Account Settings" };

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-3 border-t border-border/60 py-7 first:border-t-0 first:pt-0 md:grid-cols-[200px_1fr] md:gap-8">
      <div>
        <h2 className="text-[13.5px] font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{hint}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: userData } = await supabase
    .from("users")
    .select("id, api")
    .eq("id", user.id)
    .maybeSingle();

  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-page">
      <AppHeader
        userEmail={user.email ?? ""}
        userName={(user.user_metadata?.full_name as string) ?? null}
      />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-[21px] font-bold tracking-[-.4px] text-foreground">
            Account settings
          </h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Your profile, appearance, and API access.
          </p>
        </div>

        <Section title="Profile" hint="How you appear across WebSight.">
          <ProfileCard
            name={(user.user_metadata?.full_name as string) ?? null}
            email={user.email ?? ""}
            avatarUrl={(user.user_metadata?.avatar_url as string) ?? null}
            provider={user.app_metadata?.provider ?? null}
            memberSince={memberSince}
          />
        </Section>

        <Section title="Appearance" hint="Pick a theme for the dashboard.">
          <AppearanceCard />
        </Section>

        <Section
          title="API access"
          hint="Send server-side custom events to the /api/events endpoint."
        >
          <ApiKeyCard userId={user.id} initialApiKey={userData?.api ?? ""} />
        </Section>
      </main>
    </div>
  );
}
