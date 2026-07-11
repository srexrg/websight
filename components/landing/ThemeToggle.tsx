"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "@phosphor-icons/react";

const emptySubscribe = () => () => {};

/** Light/dark switch for the marketing pages (same next-themes store as the app). */
export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // True after hydration only; next-themes has no resolved value during SSR.
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label={mounted && resolvedTheme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      {mounted && resolvedTheme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
