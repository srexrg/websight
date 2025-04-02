import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/auth/sign-out-button";
import DomainManager from "@/components/dashboard/DomainManager";
import { ImageIcon, Settings, LogOut } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
    title: "Dashboard"
};

export default async function Dashboard() {
    const supabase = await createClient();

    const {
        data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
        redirect("/auth");
    }

    const { data: domains, error: domainsError } = await supabase
        .from('domains')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

    if (domainsError) {
        console.error('Error fetching domains:', domainsError);
    }

    return (
        <div className="flex flex-col min-h-screen bg-black">
            {/* Background Elements */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_200px,#7c3aed15,transparent)]" />
                <div className="absolute top-1/4 left-20 w-64 h-64 bg-gradient-to-br from-blue-600/10 to-indigo-600/10 rounded-full filter blur-3xl" />
                <div className="absolute bottom-1/3 right-20 w-72 h-72 bg-gradient-to-br from-indigo-600/10 to-blue-600/10 rounded-full filter blur-3xl" />
            </div>

            <header className="border-b border-zinc-800 py-6 backdrop-blur-xl bg-black/50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <Link href="/">
                                <div className="p-1.5 bg-blue-600/10 rounded-lg cursor-pointer hover:bg-blue-600/20 transition-colors">
                                    <ImageIcon className="h-6 w-6 text-blue-500" />
                                </div>
                            </Link>
                            <Link 
                                href="/" 
                                className="text-xl font-semibold text-white hover:text-blue-400 transition-colors"
                            >
                                WebSight
                            </Link>
                        </div>
                        <div className="flex items-center gap-6">
                            <Link 
                                href="/settings" 
                                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                            >
                                <Settings className="h-4 w-4" />
                                Settings
                            </Link>
                            <div className="h-5 w-px bg-zinc-800"></div>
                            <span className="text-sm text-gray-400">
                                {authUser.email}
                            </span>
                            <SignOutButton />
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 py-12 relative z-10">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mb-10">
                        <h2 className="text-3xl font-bold text-white mb-2">Welcome back, {authUser.user_metadata.full_name}!</h2>
                        <p className="text-gray-400">Manage your website domains and view analytics insights</p>
                    </div>

                    <DomainManager
                        userId={authUser.id}
                        initialDomains={domains || []}
                    />
                </div>
            </main>
        </div>
    );
}