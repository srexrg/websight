import { JourneysScreen } from "@/components/dashboard/screens/journeys-screen";

export const metadata = { title: "Journeys" };

export default async function JourneysPage({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  return <JourneysScreen site={site} />;
}
