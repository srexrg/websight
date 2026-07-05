import { RealtimeScreen } from "@/components/dashboard/screens/realtime-screen";

export const metadata = { title: "Realtime" };

export default async function RealtimePage({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  return <RealtimeScreen site={site} />;
}
