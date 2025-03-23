import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/auth/sign-out-button";
import DomainManager from "@/components/dashboard/DomainManager";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ImageIcon, LineChartIcon, GlobeIcon, SettingsIcon } from "lucide-react";

export default async function Dashboard() {
    const supabase = await createClient();

    const {
        data: { user: authUser },
    } = await supabase.auth.getUser();
    
    if (!authUser) {
        redirect("/auth");
    }

    // Fetch domains using server component
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
            {/* Dashboard Header */}
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

            {/* Dashboard Content */}
            <main className="flex-1 py-8">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold">Welcome, {authUser.user_metadata.full_name}!</h2>
                        <p className="text-muted-foreground mt-1">Manage your websites and view analytics</p>
                    </div>

                    <Tabs defaultValue="domains" className="space-y-4">
                        <TabsList>
                            <TabsTrigger value="domains" className="flex items-center gap-1.5">
                                <GlobeIcon className="h-4 w-4" />
                                Domains
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="domains" className="pt-4">
                            <DomainManager 
                                userId={authUser.id} 
                                initialDomains={domains || []} 
                            />
                        </TabsContent>

                        <TabsContent value="analytics" className="pt-4">
                            <Card className="max-w-3xl">
                                <CardHeader>
                                    <CardTitle className="text-2xl">Analytics</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="py-8 text-center text-muted-foreground">
                                        <LineChartIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                        <p className="mb-2">Your analytics will appear here after adding a domain</p>
                                        <p className="text-sm">Select the Domains tab to add a website</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="settings" className="pt-4">
                            <Card className="max-w-3xl">
                                <CardHeader>
                                    <CardTitle className="text-2xl">Account Settings</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="font-medium mb-1">Email</h3>
                                            <p className="text-muted-foreground">{authUser.email}</p>
                                        </div>
                                        <div>
                                            <h3 className="font-medium mb-1">Name</h3>
                                            <p className="text-muted-foreground">{authUser.user_metadata.full_name}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </main>
        </div>
    );
}