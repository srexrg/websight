import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import SettingsClient from "@/components/settings/SettingsClient";
import { Header } from "@/components/ui/header";

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
    <div className="flex flex-col min-h-screen bg-black">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_200px,#7c3aed15,transparent)]" />
        <div className="absolute top-1/4 left-20 w-64 h-64 bg-gradient-to-br from-blue-600/10 to-indigo-600/10 rounded-full filter blur-3xl" />
        <div className="absolute bottom-1/3 right-20 w-72 h-72 bg-gradient-to-br from-indigo-600/10 to-blue-600/10 rounded-full filter blur-3xl" />
      </div>

      <Header user={user} />
      
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