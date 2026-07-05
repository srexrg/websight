import { redirect } from "next/navigation";

export default async function SiteIndex({ params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  redirect(`/${site}/overview`);
}
