import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/auth/sign-out-button";

export default async function Dashboard() {
    const supabase = await createClient();

    const {
        data: { user: authUser },
    } = await supabase.auth.getUser();
    
    if (!authUser) {
        redirect("/auth");
    }

    return (
        <div className="flex flex-col min-h-screen">
            <main className="flex-1 flex flex-col items-center justify-center">
                <h1 className="text-4xl font-bold">Dashboard</h1>
                <p className="mt-4 text-lg">Welcome to your dashboard {authUser.user_metadata.full_name}!</p>
                <SignOutButton />
            </main>
        </div>
    );
}