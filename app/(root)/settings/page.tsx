import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import SettingsClient from "@/components/settings/SettingsClient";
import { Header } from "@/components/ui/header";
export const metadata = {
  title: "Settings | WebSight"
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
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_200px,#7c3aed15,transparent)] sm:bg-[radial-gradient(circle_1000px_at_50%_200px,#7c3aed15,transparent)]" />
        <div className="absolute top-1/4 left-10 sm:left-20 w-40 h-40 sm:w-64 sm:h-64 bg-gradient-to-br from-blue-600/10 to-indigo-600/10 rounded-full filter blur-3xl" />
        <div className="absolute bottom-1/3 right-10 sm:right-20 w-40 h-40 sm:w-72 sm:h-72 bg-gradient-to-br from-indigo-600/10 to-blue-600/10 rounded-full filter blur-3xl" />
      </div>
      <Header user={user} />
      <main className="flex-1 py-6 sm:py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="max-w-3xl mx-auto">
            <div className="mb-4 sm:mb-8">
              <h1 className="text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2">Settings</h1>
              <p className="text-sm sm:text-base text-gray-300">Manage your account settings and API keys</p>
            </div>
            <SettingsClient userId={userData.id} initialApiKey={userData?.api || ""} />
          </div>
        </div>
      </main>
    </div>
  );
}