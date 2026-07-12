// Honest comparison copy for the /compare pages. Every competitor claim here
// is written to be defensible; where a fact is version- or plan-dependent, the
// copy says so rather than asserting.

export type CompareCell = boolean | string;

export type CompareFeatureRow = {
  label: string;
  websight: CompareCell;
  competitor: CompareCell;
};

export type CompareFaq = { q: string; a: string };

export type Comparison = {
  slug: string; // "google-analytics" | "plausible" | "umami"
  competitor: string; // "Google Analytics", ...
  metaTitle: string; // <= 60 chars
  metaDescription: string; // ~150-160 chars
  heroTitle: string; // h1
  heroIntro: string; // 2-3 sentence neutral framing paragraph
  rows: CompareFeatureRow[]; // 8-12 rows
  whyWebsight: { title: string; body: string }[]; // 3-4 short sections
  whyCompetitor: { title: string; body: string }[]; // 2-3 honest reasons to pick THEM
  faqs: CompareFaq[]; // 3-4 per comparison
};

export const comparisons: Comparison[] = [
  // ─── Google Analytics ────────────────────────────────────────────────────
  {
    slug: "google-analytics",
    competitor: "Google Analytics",
    metaTitle: "WebSight vs Google Analytics: honest comparison",
    metaDescription:
      "WebSight vs Google Analytics 4, compared honestly. Cookieless and under 1 KB versus the industry standard with deep Google Ads and BigQuery integration.",
    heroTitle: "WebSight vs Google Analytics",
    heroIntro:
      "Google Analytics 4 is the industry standard, and it is free. WebSight is an open-source, cookieless alternative you can host yourself. This page lays out where each one wins so you can decide without the marketing.",
    rows: [
      { label: "Price", websight: "Free & open source", competitor: "Free" },
      { label: "License", websight: "MIT (open source)", competitor: "Proprietary" },
      { label: "Cookie consent banner", websight: "Not needed", competitor: "Required in the EU" },
      { label: "Tracking script size", websight: "<1 KB", competitor: "~50 KB+" },
      { label: "Realtime dashboard", websight: true, competitor: "Delayed and sampled" },
      { label: "Session replay", websight: true, competitor: false },
      { label: "Live 3D visitor globe", websight: true, competitor: false },
      { label: "Funnels, goals & retention", websight: true, competitor: true },
      { label: "Google Ads & BigQuery integration", websight: false, competitor: true },
      { label: "Self-hostable", websight: true, competitor: false },
      { label: "Where your data lives", websight: "Your infrastructure", competitor: "Google's ecosystem" },
      { label: "Learning curve", websight: "Minutes", competitor: "Steep" },
    ],
    whyWebsight: [
      {
        title: "No cookie banner, no consent flow",
        body: "WebSight counts visitors with a daily-rotating anonymous hash and stores no personal data, so there is nothing to consent to. That removes the banner GA4 typically forces in the EU, and the drop-off that comes with it.",
      },
      {
        title: "You own the data and the code",
        body: "WebSight is MIT-licensed and self-hostable on Next.js and Supabase. Your analytics live on your infrastructure instead of inside Google's ecosystem, and you can read every line of the tracker.",
      },
      {
        title: "Realtime that is actually real",
        body: "Visits, pages and referrers update the moment they happen, with no sampling and no processing delay. There is also session replay, a live 3D visitor globe and Core Web Vitals in the same dashboard.",
      },
      {
        title: "Readable in minutes, not weeks",
        body: "GA4's event model and reports are powerful but famously steep. WebSight shows you the numbers most people open GA to find, without the learning curve.",
      },
    ],
    whyCompetitor: [
      {
        title: "You live inside Google Ads",
        body: "If you buy Google Ads and need conversion tracking, audiences and attribution wired directly into your campaigns, GA4 does that natively. Nothing self-hosted matches that integration.",
      },
      {
        title: "You need BigQuery and heavy attribution",
        body: "GA4 exports raw event data to BigQuery for free and ships advanced attribution and audience modelling. For large teams doing serious data warehousing, that reach is hard to replace.",
      },
      {
        title: "It is the universal default",
        body: "Almost every marketer, agency and tutorial assumes GA. If you need a tool your whole team and contractors already know, the familiarity has real value.",
      },
    ],
    faqs: [
      {
        q: "Is WebSight a full replacement for Google Analytics?",
        a: "For most sites, yes: it covers pageviews, referrers, top pages, countries, devices, custom events, goals and funnels in realtime. Where it does not compete is deep Google Ads attribution and BigQuery-scale data warehousing, which remain GA4's strengths.",
      },
      {
        q: "Do I still need a cookie consent banner if I switch?",
        a: "Not for WebSight. It is cookieless and stores no personal data, so it does not trigger the consent requirements that GA4 does under GDPR and PECR. You should still review any other scripts on your site.",
      },
      {
        q: "Can I import my historical Google Analytics data?",
        a: "No. WebSight starts collecting from the day you install it and does not import GA history. Many teams run both in parallel for a while, then cut over once they trust the new numbers.",
      },
      {
        q: "How much lighter is WebSight's script?",
        a: "The WebSight tracker is under 1 KB and loads deferred, while the GA4 script is typically around 50 KB or more. On slower connections and mobile, that difference shows up in your Core Web Vitals.",
      },
    ],
  },

  // ─── Plausible ───────────────────────────────────────────────────────────
  {
    slug: "plausible",
    competitor: "Plausible",
    metaTitle: "WebSight vs Plausible: an honest comparison",
    metaDescription:
      "WebSight vs Plausible, compared honestly. Two privacy-first, cookieless, open-source analytics tools, weighed on features, licensing, hosting and price.",
    heroTitle: "WebSight vs Plausible",
    heroIntro:
      "Plausible is a well-established, privacy-first analytics tool, and the two products agree on a lot: cookieless, lightweight, open source. WebSight goes further on features like session replay and a live globe, and is free to host. Here is the honest breakdown.",
    rows: [
      { label: "Price", websight: "Free & open source", competitor: "From $9/mo hosted" },
      { label: "Free hosted tier", websight: true, competitor: false },
      { label: "License", websight: "MIT", competitor: "AGPL" },
      { label: "Cookie consent banner", websight: "Not needed", competitor: "Not needed" },
      { label: "Tracking script size", websight: "<1 KB", competitor: "<1 KB" },
      { label: "Realtime dashboard", websight: true, competitor: true },
      { label: "Session replay", websight: true, competitor: false },
      { label: "Live 3D visitor globe", websight: true, competitor: false },
      { label: "Funnels & goals", websight: true, competitor: "On paid plans" },
      { label: "Self-hostable", websight: true, competitor: true },
      { label: "Where your data lives", websight: "Your infrastructure", competitor: "EU-hosted or self-hosted" },
    ],
    whyWebsight: [
      {
        title: "Free to host, no monthly bill",
        body: "Plausible's hosted service starts from $9/mo with no free tier. WebSight's hosted app is free, and self-hosting is free forever. If cost is the reason you are looking, that is the whole answer.",
      },
      {
        title: "More than a dashboard",
        body: "WebSight adds privacy-masked session replay (rrweb), a live 3D visitor globe, retention cohorts and JS error capture on top of the classic privacy-analytics view. Plausible deliberately keeps its dashboard minimal.",
      },
      {
        title: "Funnels and goals without a plan tier",
        body: "Funnels are a paid feature on Plausible. In WebSight, events, goals, funnels and retention are all included at no cost, hosted or self-hosted.",
      },
      {
        title: "Permissive MIT licensing",
        body: "WebSight is MIT-licensed, which is simpler to embed and modify than Plausible's AGPL. If you plan to build on top of your analytics, that difference matters.",
      },
    ],
    whyCompetitor: [
      {
        title: "It is proven and steady",
        body: "Plausible has been around for years with a large user base, a mature codebase and a company behind it. If you value a long track record over newer features, that stability is a real advantage.",
      },
      {
        title: "You want the minimal dashboard on purpose",
        body: "Plausible's single-screen simplicity is a feature. If session replay and extra panels feel like clutter you would never open, its focus is exactly the point.",
      },
      {
        title: "EU-hosted by default",
        body: "Plausible's hosted service runs on EU infrastructure, which some teams need for procurement or policy reasons. WebSight leaves hosting location to you, which is more work if EU residency is a hard requirement.",
      },
    ],
    faqs: [
      {
        q: "Are WebSight and Plausible both privacy-friendly?",
        a: "Yes. Both are cookieless, avoid personal data and need no consent banner, so both are GDPR-friendly by design. The differences are in features, licensing and price, not in the privacy fundamentals.",
      },
      {
        q: "Is WebSight cheaper than Plausible?",
        a: "For most people, yes. Plausible's hosted plans start from $9/mo with no free tier, whereas WebSight's hosted app is free and self-hosting costs only your own infrastructure. Plausible also offers a self-hostable Community Edition.",
      },
      {
        q: "What does WebSight have that Plausible does not?",
        a: "Session replay, a live 3D visitor globe, retention cohorts and JS error capture, all included. Plausible focuses on a deliberately minimal dashboard and does not offer session replay.",
      },
      {
        q: "Can I self-host both?",
        a: "Yes. WebSight runs on Next.js and Supabase under an MIT license, and Plausible offers a self-hostable Community Edition under AGPL. The MIT license makes WebSight simpler to fork and build on.",
      },
    ],
  },

  // ─── Umami ───────────────────────────────────────────────────────────────
  {
    slug: "umami",
    competitor: "Umami",
    metaTitle: "WebSight vs Umami: an honest comparison",
    metaDescription:
      "WebSight vs Umami, compared honestly. Two MIT-licensed, cookieless, privacy-first analytics tools, weighed on features, hosting and dashboard depth.",
    heroTitle: "WebSight vs Umami",
    heroIntro:
      "Umami is a clean, MIT-licensed, privacy-first analytics tool that is free to self-host. WebSight shares that foundation and adds features like session replay and a live globe. If you want simple and lean, Umami is excellent; here is where the two differ.",
    rows: [
      { label: "Price", websight: "Free & open source", competitor: "Free self-hosted" },
      { label: "License", websight: "MIT", competitor: "MIT" },
      { label: "Cookie consent banner", websight: "Not needed", competitor: "Not needed" },
      { label: "Privacy-first & cookieless", websight: true, competitor: true },
      { label: "Session replay", websight: true, competitor: false },
      { label: "Live 3D visitor globe", websight: true, competitor: false },
      { label: "Custom events", websight: true, competitor: true },
      { label: "Funnels, goals & retention", websight: true, competitor: "Depending on plan/version" },
      { label: "Core Web Vitals", websight: true, competitor: false },
      { label: "Self-hostable", websight: true, competitor: true },
      { label: "Hosted cloud option", websight: "Free hosted app", competitor: "Umami Cloud (free hobby tier)" },
    ],
    whyWebsight: [
      {
        title: "A deeper dashboard out of the box",
        body: "WebSight ships privacy-masked session replay (rrweb), a live 3D visitor globe, retention cohorts, Core Web Vitals and JS error capture. Umami keeps things intentionally lean and does not offer session replay or a 3D globe.",
      },
      {
        title: "Funnels and retention included",
        body: "In Umami, features like funnels, goals and retention vary by plan and version. WebSight includes events, goals, funnels and retention cohorts everywhere, hosted or self-hosted, with nothing gated.",
      },
      {
        title: "Web performance built in",
        body: "WebSight captures Core Web Vitals and JavaScript errors alongside your traffic, so performance and analytics live in one place. That is not part of Umami's focus.",
      },
      {
        title: "Public, shareable dashboards",
        body: "Every WebSight site can generate a public share link, optionally password-protected, so you can show numbers to clients or the whole internet without handing over an account.",
      },
    ],
    whyCompetitor: [
      {
        title: "It is beautifully simple",
        body: "Umami's dashboard is clean, fast and easy to reason about. If you want the essential numbers and nothing else to think about, its restraint is a genuine strength.",
      },
      {
        title: "A very mature, popular project",
        body: "Umami is widely adopted, well documented and battle-tested across many deployments. If you want a self-hosted tool with a large community and long history, that maturity counts.",
      },
      {
        title: "A free cloud hobby tier",
        body: "Umami Cloud offers a free hobby tier and paid plans if you would rather not host anything. If managed hosting with a familiar name matters to you, that path is well trodden.",
      },
    ],
    faqs: [
      {
        q: "Are WebSight and Umami both open source?",
        a: "Yes, and both are MIT-licensed, cookieless and privacy-first. That shared foundation means the real decision is about dashboard depth and features rather than licensing or privacy.",
      },
      {
        q: "What does WebSight add over Umami?",
        a: "Session replay, a live 3D visitor globe, retention cohorts, Core Web Vitals and JS error capture, all included. Umami stays deliberately minimal and does not offer session replay or a 3D globe.",
      },
      {
        q: "Is Umami simpler than WebSight?",
        a: "In many ways, yes, and that can be a feature. Umami's dashboard is lean and focused. If you want only the core numbers with nothing extra to learn, its simplicity is a real reason to choose it.",
      },
      {
        q: "Can I self-host both for free?",
        a: "Yes. Both are MIT-licensed and free to self-host. Umami also has a cloud option with a free hobby tier, and WebSight offers a free hosted app, so you can start either without paying.",
      },
    ],
  },
];
