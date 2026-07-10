import { ReplayPlayerScreen } from "@/components/dashboard/replays/replay-player-screen";

export const metadata = { title: "Replay" };

export default async function ReplayPlayerPage({
  params,
}: {
  params: Promise<{ site: string; recordingId: string }>;
}) {
  const { site, recordingId } = await params;
  return <ReplayPlayerScreen site={site} recordingId={recordingId} />;
}
