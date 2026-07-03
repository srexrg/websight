import { describe, expect, it } from "vitest";
import { classifyChannel, referrerDomain } from "@/lib/analytics/channels";

describe("referrerDomain", () => {
  it("extracts and normalizes the hostname", () => {
    expect(referrerDomain("https://www.google.com/search?q=x")).toBe("google.com");
    expect(referrerDomain("https://t.co/abc")).toBe("t.co");
  });

  it("returns null for empty or unparseable values", () => {
    expect(referrerDomain(null)).toBeNull();
    expect(referrerDomain("")).toBeNull();
    expect(referrerDomain("not a url")).toBeNull();
  });
});

describe("classifyChannel", () => {
  it("classifies search engines as Organic Search", () => {
    expect(classifyChannel({ referrerDomain: "google.com" })).toBe("Organic Search");
    expect(classifyChannel({ referrerDomain: "google.co.uk" })).toBe("Organic Search");
    expect(classifyChannel({ referrerDomain: "duckduckgo.com" })).toBe("Organic Search");
    expect(classifyChannel({ referrerDomain: "search.brave.com" })).toBe("Organic Search");
  });

  it("classifies social networks as Social", () => {
    expect(classifyChannel({ referrerDomain: "t.co" })).toBe("Social");
    expect(classifyChannel({ referrerDomain: "reddit.com" })).toBe("Social");
    expect(classifyChannel({ referrerDomain: "news.ycombinator.com" })).toBe("Social");
    expect(classifyChannel({ referrerDomain: "m.facebook.com" })).toBe("Social");
  });

  it("classifies webmail referrers as Email", () => {
    expect(classifyChannel({ referrerDomain: "mail.google.com" })).toBe("Email");
  });

  it("classifies paid mediums and click ids as Paid", () => {
    expect(
      classifyChannel({ referrerDomain: "google.com", utmMedium: "cpc" }),
    ).toBe("Paid");
    expect(
      classifyChannel({ referrerDomain: null, queryKeys: ["gclid"] }),
    ).toBe("Paid");
    expect(
      classifyChannel({ referrerDomain: "facebook.com", queryKeys: ["fbclid"] }),
    ).toBe("Paid");
  });

  it("classifies utm_medium=email as Email regardless of referrer", () => {
    expect(
      classifyChannel({ referrerDomain: "example.com", utmMedium: "email" }),
    ).toBe("Email");
  });

  it("treats unknown external referrers as Referral", () => {
    expect(classifyChannel({ referrerDomain: "someblog.dev" })).toBe("Referral");
  });

  it("treats self-referrals as Direct", () => {
    expect(
      classifyChannel({
        referrerDomain: "mysite.com",
        siteDomains: ["mysite.com"],
      }),
    ).toBe("Direct");
    expect(
      classifyChannel({
        referrerDomain: "app.mysite.com",
        siteDomains: ["mysite.com"],
      }),
    ).toBe("Direct");
  });

  it("no referrer, no utm -> Direct; utm-tagged without referrer -> Referral", () => {
    expect(classifyChannel({ referrerDomain: null })).toBe("Direct");
    expect(
      classifyChannel({ referrerDomain: null, utmSource: "newsletter-partner" }),
    ).toBe("Referral");
  });
});
