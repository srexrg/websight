import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { AppHeader } from "@/components/dashboard/app-header";
import { ApiKeyCard } from "@/components/dashboard/api-key-card";

export const metadata = { title: "Account Settings" };

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

  return (
    <div className="min-h-screen bg-page">
      <AppHeader
        userEmail={user.email ?? ""}
        userName={(user.user_metadata?.full_name as string) ?? null}
      />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-[21px] font-bold tracking-[-.4px] text-foreground">Account Settings</h1>
          <p className="text-[13px] text-muted-foreground">API access for server-side events.</p>
        </div>
        <ApiKeyCard userId={user.id} initialApiKey={userData?.api ?? ""} />
      </main>
    </div>
  );
}
