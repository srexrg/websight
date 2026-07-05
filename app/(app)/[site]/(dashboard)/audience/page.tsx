import { AudienceScreen } from "@/components/dashboard/screens/audience-screen";

export const metadata = { title: "Audience" };

export default async function AudiencePage({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  return <AudienceScreen site={site} />;
}
