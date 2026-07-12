import type { IconKey } from "./icons";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NavLink = { label: string; href: string };

export type Feature = {
  icon: IconKey;
  title: string;
  desc: string;
  tint: string;
  fg: string;
};

export type LiveFeedItem = {
  page: string;
  meta: string;
  ago: string;
  icon: IconKey;
  tint: string;
  fg: string;
};

export type InstallStep = { n: string; title: string; desc: string };

export type FooterCol = { title: string; links: NavLink[] };

/** One comparison row: true/false renders a check/cross, a string renders as text. */
export type CompareRow = {
  label: string;
  websight: boolean | string;
  ga: boolean | string;
  plausible: boolean | string;
};

export type Faq = { q: string; a: string };

// ─── Navigation ───────────────────────────────────────────────────────────────

export const navLinks: NavLink[] = [
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Docs", href: "/docs" },
];

// ─── Features ─────────────────────────────────────────────────────────────────

export const features: Feature[] = [
  {
    icon: "broadcast",
    title: "Realtime by default",
    desc: "Live visitor counts, pages and referrers that update the second they happen — no five-minute delay.",
    tint: "#E7F6EF",
    fg: "#0E9C6E",
  },
  {
    icon: "globe-hemisphere-west",
    title: "Live visitor globe",
    desc: "A real, spinning 3D globe that lights up wherever your readers are right now. Strangely addictive.",
    tint: "#EAF1FB",
    fg: "#3B7BE0",
  },
  {
    icon: "shield-check",
    title: "Privacy-first",
    desc: "No cookies, no cross-site tracking, no personal data. GDPR, CCPA and PECR compliant out of the box.",
    tint: "#FDF1E7",
    fg: "#E0883B",
  },
  {
    icon: "feather",
    title: "Under 1KB",
    desc: "A featherweight script that never slows your site down. Async, deferred and cache-friendly.",
    tint: "#F1ECFB",
    fg: "#7C5CE0",
  },
  {
    icon: "target",
    title: "Events & funnels",
    desc: "Track signups, clicks and custom goals, then visualize drop-off with conversion funnels.",
    tint: "#E7F6EF",
    fg: "#0E9C6E",
  },
  {
    icon: "funnel-simple",
    title: "Filters & segments",
    desc: "Slice traffic by source, country, device or campaign with one click. Answers in seconds.",
    tint: "#FCEAF0",
    fg: "#D6568B",
  },
];

// ─── Globe section bullet points ──────────────────────────────────────────────

export const globePoints: string[] = [
  "Pulsing markers for every active visitor, worldwide",
  "Drag to spin, click to pause, tap a marker for details",
  "Live, 24h, 7d, 30d, 90d, 1y or all-time views",
];

// ─── Live activity feed ────────────────────────────────────────────────────────

export const liveFeed: LiveFeedItem[] = [
  {
    page: "/blog/ship-fast",
    meta: "via google.com · India",
    ago: "now",
    tint: "#E7F6EF",
    fg: "#0E9C6E",
    icon: "cursor-click",
  },
  {
    page: "/pricing",
    meta: "via X / Twitter · Germany",
    ago: "4s",
    tint: "#EAF1FB",
    fg: "#3B7BE0",
    icon: "cursor-click",
  },
  {
    page: "/",
    meta: "Direct · United States",
    ago: "11s",
    tint: "#FDF1E7",
    fg: "#E0883B",
    icon: "cursor-click",
  },
  {
    page: "/docs/quickstart",
    meta: "via github.com · Brazil",
    ago: "23s",
    tint: "#F1ECFB",
    fg: "#7C5CE0",
    icon: "cursor-click",
  },
  {
    page: "/changelog",
    meta: "via Hacker News · UK",
    ago: "38s",
    tint: "#E7F6EF",
    fg: "#0E9C6E",
    icon: "cursor-click",
  },
];

// ─── 30-second install steps ───────────────────────────────────────────────────

export const installSteps: InstallStep[] = [
  { n: "1", title: "Add your site", desc: "Create a project and grab your unique snippet." },
  { n: "2", title: "Paste the script", desc: "Drop one line into your <head> — done." },
  { n: "3", title: "Watch it live", desc: "Open the globe and see visits roll in." },
];

// ─── Comparison (vs the tools people actually switch from) ────────────────────

export const compareRows: CompareRow[] = [
  { label: "Price", websight: "Free & open source", ga: "Free (you're the product)", plausible: "From $9/mo" },
  { label: "Cookie consent banner", websight: "Not needed", ga: "Required", plausible: "Not needed" },
  { label: "Script size", websight: "<1 KB", ga: "~50 KB+", plausible: "<1 KB" },
  { label: "Realtime dashboard", websight: true, ga: "Delayed", plausible: "Limited" },
  { label: "Live visitor globe", websight: true, ga: false, plausible: false },
  { label: "Session replay", websight: true, ga: false, plausible: false },
  { label: "Funnels, goals & retention", websight: true, ga: true, plausible: "Paid add-on" },
  { label: "Self-hostable", websight: true, ga: false, plausible: true },
];

// ─── FAQ ───────────────────────────────────────────────────────────────────────

export const faqs: Faq[] = [
  {
    q: "Do I need a cookie consent banner?",
    a: "No. WebSight is cookieless by default: visitors are counted with a daily-rotating anonymous hash, so there is nothing to consent to. GDPR, CCPA and PECR compliant out of the box.",
  },
  {
    q: "Is WebSight really free?",
    a: "Yes. The code is MIT-licensed and self-hosting is free forever. No credit card required.",
  },
  {
    q: "How long does setup take?",
    a: "About 30 seconds. Add your domain, paste one script tag into your <head>, and visits start streaming into the realtime dashboard immediately.",
  },
  {
    q: "Will it slow my site down?",
    a: "No. The tracker is under 1 KB, loads deferred, and never blocks rendering. Your Core Web Vitals will not notice it exists.",
  },
  {
    q: "Can I self-host it?",
    a: "Yes. WebSight is a Next.js app backed by Supabase; the docs include a step-by-step self-hosting guide. Your data stays on your infrastructure.",
  },
  {
    q: "Can I share my analytics publicly?",
    a: "Yes. Every site can generate a public share link, optionally password-protected, so you can show your numbers to teammates, clients, or the whole internet.",
  },
];

// ─── Footer columns ────────────────────────────────────────────────────────────

export const footerCols: FooterCol[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Pricing", href: "/#pricing" },
      { label: "vs Google Analytics", href: "/compare/google-analytics" },
      { label: "vs Plausible", href: "/compare/plausible" },
      { label: "vs Umami", href: "/compare/umami" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Docs", href: "/docs" },
      { label: "Quickstart", href: "/docs/getting-started/quickstart" },
      { label: "API", href: "/docs/tracking/api" },
      { label: "Self-hosting", href: "/docs/resources/self-hosting" },
    ],
  },
  {
    title: "Open source",
    links: [
      { label: "GitHub", href: "https://github.com/srexrg/websight" },
      { label: "Issues", href: "https://github.com/srexrg/websight/issues" },
      { label: "Privacy", href: "/docs/resources/privacy" },
    ],
  },
];
