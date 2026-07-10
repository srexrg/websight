/**
 * Typed navigation registry for the app shell (docs/redesign/03). Screens
 * whose plans have not shipped stay `enabled: false` and are hidden by the
 * sidebar - flip the flag when the plan lands.
 */

export type NavItem = {
  slug: string;
  label: string;
  /** Phosphor icon name rendered by the sidebar. */
  icon: string;
  enabled: boolean;
};

export type NavSection = {
  title: string | null;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Analytics",
    items: [
      { slug: "overview", label: "Overview", icon: "chart-line", enabled: true },
      { slug: "realtime", label: "Realtime", icon: "broadcast", enabled: true },
      { slug: "globe", label: "Globe", icon: "globe-hemisphere-west", enabled: true },
      { slug: "pages", label: "Pages", icon: "file-text", enabled: true },
      { slug: "sources", label: "Sources", icon: "arrow-bend-down-right", enabled: true },
      { slug: "audience", label: "Audience", icon: "users-three", enabled: true },
      { slug: "events", label: "Events", icon: "target", enabled: true },
    ],
  },
  {
    title: "Behavior",
    items: [
      { slug: "sessions", label: "Sessions", icon: "list-bullets", enabled: true }, // plan 07
      { slug: "replays", label: "Replays", icon: "monitor-play", enabled: true }, // plan 24
      { slug: "profiles", label: "Profiles", icon: "user-circle", enabled: true }, // plan 07
      { slug: "funnels", label: "Funnels", icon: "funnel", enabled: true }, // plan 09
      { slug: "goals", label: "Goals", icon: "flag", enabled: true }, // plan 08
      { slug: "journeys", label: "Journeys", icon: "path", enabled: true }, // plan 10
      { slug: "retention", label: "Retention", icon: "arrows-clockwise", enabled: true }, // plan 11
    ],
  },
  {
    title: "Health",
    items: [
      { slug: "vitals", label: "Web Vitals", icon: "heartbeat", enabled: true }, // plan 12
      { slug: "errors", label: "Errors", icon: "warning-octagon", enabled: true }, // plan 13
    ],
  },
];

export const SETTINGS_ITEM: NavItem = {
  slug: "settings",
  label: "Settings",
  icon: "gear-six",
  enabled: true,
};

export function enabledSlugs(): Set<string> {
  const slugs = new Set<string>([SETTINGS_ITEM.slug]);
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) if (item.enabled) slugs.add(item.slug);
  }
  return slugs;
}

export function screenTitle(slug: string): string {
  if (slug === SETTINGS_ITEM.slug) return SETTINGS_ITEM.label;
  for (const section of NAV_SECTIONS) {
    const item = section.items.find((i) => i.slug === slug);
    if (item) return item.label;
  }
  return "Overview";
}
