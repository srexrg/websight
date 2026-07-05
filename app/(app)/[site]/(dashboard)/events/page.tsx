import { EventsScreen } from "@/components/dashboard/screens/events-screen";

export const metadata = { title: "Events" };

export default async function EventsPage({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  return <EventsScreen site={site} />;
}
