import { OverviewScreen } from "@/components/dashboard/screens/overview-screen";

export const metadata = { title: "Overview" };

export default async function OverviewPage({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  return <OverviewScreen site={site} />;
}
