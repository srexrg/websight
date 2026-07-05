import { PagesScreen } from "@/components/dashboard/screens/pages-screen";

export const metadata = { title: "Pages" };

export default async function PagesPage({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  return <PagesScreen site={site} />;
}
