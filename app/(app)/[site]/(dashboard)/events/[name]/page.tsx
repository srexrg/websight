import { EventDetailScreen } from "@/components/dashboard/screens/event-detail-screen";

export const metadata = { title: "Event detail" };

export default async function EventDetailPage({ params }: { params: Promise<{ site: string; name: string }> }) {
  const { site, name } = await params;
  return <EventDetailScreen site={site} name={decodeURIComponent(name)} />;
}
