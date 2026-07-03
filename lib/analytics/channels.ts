import type { Channel } from "./types";

/**
 * Referrer -> channel grouping (compact port of the snowplow referer-parser
 * idea; domain suffix matching). Channels: Direct, Organic Search, Social,
 * Email, Paid, Referral.
 */

const SEARCH_DOMAINS = [
  "google.",
  "bing.com",
  "duckduckgo.com",
  "search.yahoo.com",
  "yandex.",
  "baidu.com",
  "ecosia.org",
  "qwant.com",
  "search.brave.com",
  "startpage.com",
  "kagi.com",
  "presearch.com",
  "ask.com",
  "aol.com",
  "naver.com",
  "seznam.cz",
];

const SOCIAL_DOMAINS = [
  "facebook.com",
  "fb.com",
  "m.facebook.com",
  "l.facebook.com",
  "instagram.com",
  "l.instagram.com",
  "twitter.com",
  "t.co",
  "x.com",
  "linkedin.com",
  "lnkd.in",
  "reddit.com",
  "out.reddit.com",
  "pinterest.",
  "tiktok.com",
  "youtube.com",
  "youtu.be",
  "threads.net",
  "bsky.app",
  "mastodon.social",
  "news.ycombinator.com",
  "lobste.rs",
  "snapchat.com",
  "whatsapp.com",
  "telegram.org",
  "t.me",
  "discord.com",
  "discord.gg",
  "medium.com",
  "substack.com",
];

const EMAIL_DOMAINS = [
  "mail.google.com",
  "outlook.live.com",
  "outlook.office.com",
  "outlook.office365.com",
  "mail.yahoo.com",
  "mail.proton.me",
  "protonmail.com",
  "mail.aol.com",
  "mail.zoho.com",
  "webmail.",
  "e.mail.ru",
  "fastmail.com",
  "hey.com",
];

const PAID_MEDIUMS = new Set([
  "cpc",
  "ppc",
  "cpm",
  "cpv",
  "paid",
  "paidsearch",
  "paid_search",
  "paid-social",
  "paid_social",
  "paidsocial",
  "display",
  "banner",
  "retargeting",
  "remarketing",
  "affiliate",
]);

const PAID_CLICK_IDS = ["gclid", "fbclid", "msclkid", "ttclid", "twclid", "li_fat_id"];

function domainMatches(domain: string, patterns: string[]): boolean {
  return patterns.some((p) =>
    p.endsWith(".") ? domain.includes(p) : domain === p || domain.endsWith(`.${p}`),
  );
}

/** Hostname of a referrer URL, lowercased, www-stripped. Null when unparseable. */
export function referrerDomain(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (!host) return null;
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return null;
  }
}

export function classifyChannel(input: {
  referrerDomain: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  /** Query keys present on the tracked URL (for paid click-id detection). */
  queryKeys?: string[];
  /** The site's own domains; self-referrals count as Direct. */
  siteDomains?: string[];
}): Channel {
  const medium = input.utmMedium?.toLowerCase() ?? "";
  const source = input.utmSource?.toLowerCase() ?? "";
  const hasUtm = Boolean(source || medium);
  const keys = input.queryKeys ?? [];

  if (PAID_MEDIUMS.has(medium) || PAID_CLICK_IDS.some((k) => keys.includes(k))) {
    return "Paid";
  }
  if (medium === "email" || medium === "e-mail" || source === "email") {
    return "Email";
  }
  if (medium === "social" || medium === "organic_social") {
    return "Social";
  }

  let ref = input.referrerDomain;
  if (ref && input.siteDomains?.some((d) => ref === d || ref!.endsWith(`.${d}`))) {
    ref = null; // self-referral
  }

  if (ref) {
    // Email first: webmail hosts (mail.google.com) would otherwise match the
    // broader search patterns (google.).
    if (domainMatches(ref, EMAIL_DOMAINS)) return "Email";
    if (domainMatches(ref, SEARCH_DOMAINS)) return "Organic Search";
    if (domainMatches(ref, SOCIAL_DOMAINS)) return "Social";
    return "Referral";
  }

  // No external referrer: tagged traffic is Referral-by-tag, untagged is Direct.
  return hasUtm ? "Referral" : "Direct";
}
