import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ReplaysScreen } from "@/components/dashboard/replays/replays-screen";
import { replayStorageConfigured } from "@/lib/replay/storage";

export const metadata = { title: "Replays" };

export default async function ReplaysPage({ params }: { params: Promise<{ site: string }> }) {
  const { site: publicId } = await params;
  const supabase = await createClient();
  const { data: site } = await supabase
    .from("sites")
    .select("public_id, settings")
    .eq("public_id", publicId)
    .maybeSingle();
  if (!site) notFound();

  const settings = (site.settings as Record<string, unknown> | null) ?? {};

  return (
    <ReplaysScreen
      site={site.public_id}
      replayEnabled={settings.replay_enabled === true}
      storageConfigured={replayStorageConfigured()}
    />
  );
}
