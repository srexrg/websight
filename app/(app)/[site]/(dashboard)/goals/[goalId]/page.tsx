import { GoalDetailScreen } from "@/components/dashboard/screens/goal-detail-screen";

export const metadata = { title: "Goal" };

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ site: string; goalId: string }>;
}) {
  const { site, goalId } = await params;
  return <GoalDetailScreen site={site} goalId={goalId} />;
}
