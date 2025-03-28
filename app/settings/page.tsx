import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import SettingsClient from "@/components/settings/SettingsClient";
import Link from "next/link";

export const metadata = {
  title: "Settings"
};

export default async function SettingsPage() {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: userData } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="border-b py-6">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to Dashboard
              </Link>
              <h1 className="text-xl font-semibold">Settings</h1>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">{user.email}</span>
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <SettingsClient userId={userData.id} initialApiKey={userData?.api || ""} />
          </div>
        </div>
      </main>
    </div>
  );
}