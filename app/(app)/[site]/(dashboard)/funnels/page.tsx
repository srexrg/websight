import { FunnelsScreen } from "@/components/dashboard/screens/funnels-screen";

export const metadata = { title: "Funnels" };

export default async function FunnelsPage({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  return <FunnelsScreen site={site} />;
}
