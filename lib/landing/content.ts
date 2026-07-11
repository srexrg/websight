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

export type Logo = { icon: IconKey; name: string };

export type LiveFeedItem = {
  page: string;
  meta: string;
  ago: string;
  icon: IconKey;
  tint: string;
  fg: string;
};

export type InstallStep = { n: string; title: string; desc: string };

export type Stat = { value: string; label: string };

export type Plan = {
  name: string;
  tagline: string;
  monthly: number;
  annual: number;
  popular: boolean;
  cta: string;
  features: string[];
};

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
  { label: "Features", href: "#features" },
  { label: "Globe", href: "#globe" },
  { label: "Pricing", href: "#pricing" },
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

// ─── Trust bar logos ───────────────────────────────────────────────────────────

export const logos: Logo[] = [
  { icon: "cube", name: "Hyperflow" },
  { icon: "stack", name: "Castle" },
  { icon: "cloud", name: "Nimbus" },
  { icon: "anchor-simple", name: "Forge" },
  { icon: "infinity", name: "Loop" },
  { icon: "leaf", name: "Verdant" },
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

// ─── Stats band ────────────────────────────────────────────────────────────────

export const stats: Stat[] = [
  { value: "12.4k+", label: "Sites tracked" },
  { value: "3.2B", label: "Events / month" },
  { value: "<1KB", label: "Script size" },
  { value: "99.9%", label: "Uptime" },
];

// ─── Pricing plans ────────────────────────────────────────────────────────────
// monthly: price in USD/month billed monthly
// annual:  price in USD/month billed annually (approx -20%)

export const plans: Plan[] = [
  {
    name: "Hobby",
    tagline: "Everything to get started on a side project.",
    monthly: 0,
    annual: 0,
    popular: false,
    cta: "Start free",
    features: [
      "1 site",
      "10k events / month",
      "Realtime dashboard",
      "Live visitor globe",
      "6-month retention",
    ],
  },
  {
    name: "Pro",
    tagline: "For makers shipping products people use.",
    monthly: 9,
    annual: 7,
    popular: true,
    cta: "Start Pro trial",
    features: [
      "10 sites",
      "1M events / month",
      "Events & funnels",
      "Custom dashboards",
      "3-year retention",
      "Email reports",
    ],
  },
  {
    name: "Business",
    tagline: "For teams and agencies running many sites.",
    monthly: 29,
    annual: 24,
    popular: false,
    cta: "Start Business",
    features: [
      "Unlimited sites",
      "10M events / month",
      "Team seats & roles",
      "API access",
      "Priority support",
      "Self-host license",
    ],
  },
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
    a: "Yes. The code is MIT-licensed and self-hosting is free forever. The hosted Hobby plan is also free for 10k events a month, no credit card required.",
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
      { label: "Features", href: "#" },
      { label: "Live globe", href: "#" },
      { label: "Pricing", href: "#" },
      { label: "Changelog", href: "#" },
      { label: "Roadmap", href: "#" },
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
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Open source", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
];
