import { SessionsScreen } from "@/components/dashboard/screens/sessions-screen";

export const metadata = { title: "Sessions" };

export default async function SessionsPage({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  return <SessionsScreen site={site} />;
}
