import { DATA } from "@/data/site.config";

const GITHUB_URL = "https://github.com/srexrg/websight";
const NPM_URL = "https://www.npmjs.com/package/websight";
const LICENSE_URL = "https://github.com/srexrg/websight/blob/main/LICENSE";

const SOFTWARE_DESCRIPTION =
  "Open-source, privacy-first web analytics. Cookieless tracking under 1KB, a realtime dashboard, session replay, funnels and goals. Self-hostable and MIT licensed.";

/** Organization node reused as author and publisher across other schemas. */
function organization(): Record<string, unknown> {
  return {
    "@type": "Organization",
    name: DATA.name,
    url: DATA.url,
    logo: `${DATA.url}/icon.svg`,
    sameAs: [GITHUB_URL, NPM_URL],
  };
}

export function organizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    ...organization(),
  };
}

export function webSiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: DATA.name,
    url: DATA.url,
    description: DATA.description,
  };
}

export function softwareApplicationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: DATA.name,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    url: DATA.url,
    description: SOFTWARE_DESCRIPTION,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    license: LICENSE_URL,
    screenshot: `${DATA.url}${DATA.prevImage}`,
    sameAs: [GITHUB_URL, NPM_URL],
  };
}

export function faqPageJsonLd(
  faqs: { q: string; a: string }[]
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  };
}

export function techArticleJsonLd({
  title,
  description,
  url,
}: {
  title: string;
  description?: string;
  url: string;
}): Record<string, unknown> {
  const article: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: title,
    url,
    author: organization(),
    publisher: organization(),
  };
  if (description) {
    article.description = description;
  }
  return article;
}

export function breadcrumbJsonLd(
  items: { name: string; url: string }[]
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
