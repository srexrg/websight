import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export const metadata = { title: "Get started" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { count } = await supabase
    .from("sites")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  return <OnboardingFlow firstSite={(count ?? 0) === 0} />;
}
