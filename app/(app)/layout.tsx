import { DashboardProviders } from "@/components/dashboard/providers";

/**
 * Authed app group (docs/redesign/03): client providers only. The session
 * gate lives in each child segment ([site]/layout, dashboard, onboarding,
 * settings) rather than here, so an unknown top-level path can 404 before
 * any auth redirect. New segments under this group must gate themselves.
 */
export const metadata = {
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <DashboardProviders>{children}</DashboardProviders>;
}
