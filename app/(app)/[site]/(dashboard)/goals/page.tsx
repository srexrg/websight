import { GoalsScreen } from "@/components/dashboard/screens/goals-screen";

export const metadata = { title: "Goals" };

export default async function GoalsPage({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  return <GoalsScreen site={site} />;
}
