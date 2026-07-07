import { ErrorDetailScreen } from "@/components/dashboard/screens/error-detail-screen";

export const metadata = { title: "Error detail" };

export default async function ErrorDetailPage({ params }: { params: Promise<{ site: string; groupId: string }> }) {
  const { site, groupId } = await params;
  return <ErrorDetailScreen site={site} groupId={groupId} />;
}
