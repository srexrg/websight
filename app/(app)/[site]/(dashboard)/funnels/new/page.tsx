import { FunnelEditor } from "@/components/dashboard/funnels/funnel-editor";

export const metadata = { title: "New funnel" };

export default async function NewFunnelPage({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  return <FunnelEditor site={site} funnel={null} />;
}
