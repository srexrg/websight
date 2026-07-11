"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Desktop, Moon, Sun, type Icon } from "@phosphor-icons/react";

const OPTIONS: { value: string; label: string; icon: Icon }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Desktop },
];

const emptySubscribe = () => () => {};

/** Theme picker for the account settings page (same store as the shell menus). */
export function AppearanceCard() {
  const { theme, setTheme } = useTheme();
  // next-themes is undefined until mounted; render the frame without an active
  // state instead of flashing a wrong selection.
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  return (
    <section className="rounded-2xl border border-border bg-card px-[18px] py-4 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[13.5px] font-semibold text-foreground">Interface theme</h3>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            Applies to the dashboard on this device.
          </p>
        </div>
        <div className="flex rounded-lg border border-border bg-secondary/60 p-0.5">
          {OPTIONS.map(({ value, label, icon: IconComp }) => {
            const active = mounted && theme === value;
            return (
              <button
                key={value}
                onClick={() => setTheme(value)}
                aria-pressed={active}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
                  active
                    ? "bg-card text-foreground shadow-[0_1px_2px_rgba(16,24,40,.08)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <IconComp size={14} weight={active ? "fill" : "regular"} />
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
