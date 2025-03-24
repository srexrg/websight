import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/auth/sign-out-button";
import DomainManager from "@/components/dashboard/DomainManager";
import { ImageIcon } from "lucide-react";

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
        <div className="flex flex-col min-h-screen bg-background">
 
            <header className="border-b py-6">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-primary/10 rounded-lg">
                                <ImageIcon className="h-6 w-6 text-primary" />
                            </div>
                            <h1 className="text-xl font-semibold">WebSight</h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-muted-foreground">
                                {authUser.email}
                            </span>
                            <SignOutButton />
                        </div>
                    </div>
                </div>
            </header>

           
            <main className="flex-1 py-8">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold">Welcome, {authUser.user_metadata.full_name}!</h2>
                        <p className="text-muted-foreground mt-1">Manage your website domains</p>
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