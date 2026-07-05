import { GlobeScreen } from "@/components/dashboard/screens/globe-screen";

export const metadata = { title: "Globe" };

export default async function GlobePage({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  return <GlobeScreen site={site} />;
}
