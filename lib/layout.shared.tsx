import { ChartLineUp } from "@phosphor-icons/react/dist/ssr";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

/**
 * Shared layout options for every Fumadocs surface (docs layout + search).
 * The nav title recreates components/brand/Logo.tsx inline at docs scale so it
 * renders server-side without pulling in the client wordmark component.
 */
export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="flex items-center gap-2">
          <span
            className="flex items-center justify-center rounded-[7px] bg-brand text-white"
            style={{ width: 22, height: 22, boxShadow: "0 2px 8px rgba(14,156,110,.34)" }}
          >
            <ChartLineUp size={13} weight="bold" />
          </span>
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
