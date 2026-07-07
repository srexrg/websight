import { ErrorsScreen } from "@/components/dashboard/screens/errors-screen";

export const metadata = { title: "Errors" };

export default async function ErrorsPage({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  return <ErrorsScreen site={site} />;
}
