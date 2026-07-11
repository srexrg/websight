import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { LogoMark } from "@/components/brand/Logo";

/**
 * Shared layout options for every Fumadocs surface (docs layout + search).
 * The nav title uses the shared brand mark at docs scale.
 */
export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="flex items-center gap-2">
          <LogoMark size={22} />
          <span className="text-[15px] font-bold tracking-[-0.3px] text-foreground">
            WebSight
          </span>
        </span>
      ),
    },
    githubUrl: "https://github.com/srexrg/websight",
    links: [
      {
        text: "Home",
        url: "/",
      },
      {
        text: "Dashboard",
        url: "/dashboard",
      },
    ],
  };
}
