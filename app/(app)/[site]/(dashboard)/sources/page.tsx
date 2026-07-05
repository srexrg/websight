import { SourcesScreen } from "@/components/dashboard/screens/sources-screen";

export const metadata = { title: "Sources" };

export default async function SourcesPage({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  return <SourcesScreen site={site} />;
}
