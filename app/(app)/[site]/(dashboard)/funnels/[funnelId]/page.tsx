import { FunnelDetailScreen } from "@/components/dashboard/screens/funnel-detail-screen";

export const metadata = { title: "Funnel" };

export default async function FunnelDetailPage({
  params,
}: {
  params: Promise<{ site: string; funnelId: string }>;
}) {
  const { site, funnelId } = await params;
  return <FunnelDetailScreen site={site} funnelId={funnelId} />;
}
