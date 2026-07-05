"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Check, Desktop, GearSix, Moon, SignOut, Sun } from "@phosphor-icons/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/utils/supabase/client";

export function AccountMenu({
  userEmail,
  userName,
}: {
  userEmail: string;
  userName?: string | null;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 hover:bg-secondary">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent font-mono text-[12px] font-semibold text-accent-foreground">
            {(userName ?? userEmail).slice(0, 1).toUpperCase()}
          </span>
          <span className="hidden text-[13px] font-semibold text-foreground sm:block">
            {userName ?? userEmail.split("@")[0]}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={() => router.push("/settings")} className="gap-2">
          <GearSix size={14} /> Account settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
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
        <DropdownMenuItem
          onClick={async () => {
            await createClient().auth.signOut();
            router.push("/");
            router.refresh();
          }}
          className="gap-2 text-danger focus:text-danger"
        >
          <SignOut size={14} /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
