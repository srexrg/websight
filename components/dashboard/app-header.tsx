import Link from "next/link";
import { AccountMenu } from "./account-menu";

/** Slim header for shell-less authed pages (sites grid, account settings). */
export function AppHeader({ userEmail, userName }: { userEmail: string; userName?: string | null }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-page/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-[#5FD3A6] font-mono text-[13px] font-bold text-white">
            W
          </span>
          <span className="text-[15px] font-bold tracking-tight text-foreground">WebSight</span>
        </Link>
        <AccountMenu userEmail={userEmail} userName={userName} />
      </div>
    </header>
  );
}
