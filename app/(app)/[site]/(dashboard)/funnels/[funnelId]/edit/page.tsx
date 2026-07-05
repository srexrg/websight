import { FunnelEditLoader } from "@/components/dashboard/funnels/funnel-edit-loader";

export const metadata = { title: "Edit funnel" };

export default async function EditFunnelPage({
  params,
}: {
  params: Promise<{ site: string; funnelId: string }>;
}) {
  const { site, funnelId } = await params;
  return <FunnelEditLoader site={site} funnelId={funnelId} />;
}
