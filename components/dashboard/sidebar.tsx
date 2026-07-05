"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";
import { useTheme } from "next-themes";
import {
  ArrowBendDownRight,
  ArrowsClockwise,
  Broadcast,
  CaretUpDown,
  ChartLine,
  Check,
  Desktop,
  FileText,
  Flag,
  Funnel,
  GearSix,
  GlobeHemisphereWest,
  Heartbeat,
  ListBullets,
  Moon,
  Path,
  Plus,
  SidebarSimple,
  SignOut,
  Sun,
  Target,
  UsersThree,
  WarningOctagon,
  type Icon,
} from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/utils/supabase/client";
import { NAV_SECTIONS, SETTINGS_ITEM } from "@/lib/dashboard/nav";

const ICONS: Record<string, Icon> = {
  "chart-line": ChartLine,
  broadcast: Broadcast,
  "globe-hemisphere-west": GlobeHemisphereWest,
  "file-text": FileText,
  "arrow-bend-down-right": ArrowBendDownRight,
  "users-three": UsersThree,
  target: Target,
  "list-bullets": ListBullets,
  funnel: Funnel,
  flag: Flag,
  path: Path,
  "arrows-clockwise": ArrowsClockwise,
  heartbeat: Heartbeat,
  "warning-octagon": WarningOctagon,
  "gear-six": GearSix,
};

export type SidebarSite = { public_id: string; name: string; domains: string[] };

const COLLAPSE_KEY = "ws_sidebar_collapsed";

// Collapse state lives in localStorage; a tiny external store keeps it in
// sync with React without setState-in-effect hydration hacks.
const collapseListeners = new Set<() => void>();
function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}
function writeCollapsed(v: boolean): void {
  try {
    localStorage.setItem(COLLAPSE_KEY, v ? "1" : "0");
  } catch {}
  collapseListeners.forEach((l) => l());
}
function subscribeCollapsed(cb: () => void): () => void {
  collapseListeners.add(cb);
  return () => collapseListeners.delete(cb);
}

function favicon(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

export function Sidebar({
  sites,
  current,
  userEmail,
  userName,
}: {
  sites: SidebarSite[];
  current: SidebarSite;
  userEmail: string;
  userName?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  const toggleCollapsed = () => writeCollapsed(!collapsed);

  const activeSlug = pathname.split("/")[2] ?? "overview";

  const navLink = (slug: string, label: string, iconName: string): ReactNode => {
    const IconComp = ICONS[iconName] ?? ChartLine;
    const active = activeSlug === slug;
    return (
      <Link
        key={slug}
        href={`/${current.public_id}/${slug}`}
        title={collapsed ? label : undefined}
        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13.5px] transition-colors ${
          active
            ? "bg-accent font-semibold text-accent-foreground"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        } ${collapsed ? "justify-center px-2" : ""}`}
      >
        <IconComp size={17} weight={active ? "fill" : "regular"} />
        {!collapsed && label}
      </Link>
    );
  };

  const signOut = async () => {
    await createClient().auth.signOut();
    router.push("/auth");
    router.refresh();
  };

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 ${
        collapsed ? "w-[64px]" : "w-[248px]"
      }`}
    >
      {/* Logo row */}
      <div className={`flex items-center gap-2 px-4 pb-2 pt-4 ${collapsed ? "justify-center px-2" : ""}`}>
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-[#5FD3A6] font-mono text-[13px] font-bold text-white">
            W
          </span>
          {!collapsed && <span className="text-[15px] font-bold tracking-tight text-foreground">WebSight</span>}
        </Link>
        <button
          onClick={toggleCollapsed}
          className={`ml-auto rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground ${collapsed ? "hidden" : ""}`}
          aria-label="Collapse sidebar"
        >
          <SidebarSimple size={16} />
        </button>
      </div>

      {/* Site switcher */}
      <div className={`px-3 pb-2 ${collapsed ? "px-2" : ""}`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`flex w-full items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-2 text-left hover:bg-surface-2 dark:hover:bg-secondary/60 ${
                collapsed ? "justify-center px-1.5" : ""
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={favicon(current.domains[0] ?? "")} alt="" className="h-5 w-5 rounded" />
              {!collapsed && (
                <>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">
                    {current.name}
                  </span>
                  <CaretUpDown size={14} className="shrink-0 text-muted-foreground" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {sites.map((s) => (
              <DropdownMenuItem
                key={s.public_id}
                onClick={() => router.push(`/${s.public_id}/${activeSlug === "settings" ? "overview" : activeSlug}`)}
                className="gap-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={favicon(s.domains[0] ?? "")} alt="" className="h-4 w-4 rounded" />
                <span className="min-w-0 flex-1 truncate">{s.name}</span>
                {s.public_id === current.public_id && <Check size={14} className="text-accent-foreground" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/dashboard")} className="gap-2">
              <Plus size={14} />
              All sites / add site
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Nav */}
      <nav className={`flex-1 overflow-y-auto px-3 pb-2 ${collapsed ? "px-2" : ""}`}>
        {NAV_SECTIONS.map((section) => {
          const items = section.items.filter((i) => i.enabled);
          if (items.length === 0) return null;
          return (
            <div key={section.title ?? "root"} className="mt-3 first:mt-1">
              {section.title && !collapsed && (
                <p className="px-2.5 pb-1 text-[11px] font-bold uppercase tracking-[.8px] text-muted-foreground/60">
                  {section.title}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {items.map((i) => navLink(i.slug, i.label, i.icon))}
              </div>
            </div>
          );
        })}
        <div className="mt-3 flex flex-col gap-0.5 border-t border-border pt-3">
          {navLink(SETTINGS_ITEM.slug, SETTINGS_ITEM.label, SETTINGS_ITEM.icon)}
        </div>
      </nav>

      {/* User footer */}
      <div className={`border-t border-border p-3 ${collapsed ? "p-2" : ""}`}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left hover:bg-secondary ${
                collapsed ? "justify-center" : ""
              }`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent font-mono text-[12px] font-semibold text-accent-foreground">
                {(userName ?? userEmail).slice(0, 1).toUpperCase()}
              </span>
              {!collapsed && (
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-foreground">
                    {userName ?? userEmail.split("@")[0]}
                  </span>
                  <span className="block truncate text-[11.5px] text-muted-foreground">{userEmail}</span>
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-52">
            <DropdownMenuItem onClick={() => setTheme("light")} className="gap-2">
              <Sun size={14} /> Light {theme === "light" && <Check size={13} className="ml-auto" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")} className="gap-2">
              <Moon size={14} /> Dark {theme === "dark" && <Check size={13} className="ml-auto" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")} className="gap-2">
              <Desktop size={14} /> System {theme === "system" && <Check size={13} className="ml-auto" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="gap-2 text-danger focus:text-danger">
              <SignOut size={14} /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {collapsed && (
          <button
            onClick={toggleCollapsed}
            className="mt-1 flex w-full justify-center rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Expand sidebar"
          >
            <SidebarSimple size={16} />
          </button>
        )}
      </div>
    </aside>
  );
}
