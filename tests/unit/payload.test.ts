import { describe, expect, it } from "vitest";
import {
  isLegacyPayload,
  MAX_BATCH_SIZE,
  normalizeBatch,
  normalizePayload,
  parseTrackedUrl,
} from "@/lib/analytics/payload";

describe("parseTrackedUrl", () => {
  it("strips query params except utm_*, ref, source", () => {
    const { path, urlQuery, queryKeys } = parseTrackedUrl(
      "https://example.com/pricing?utm_source=news&utm_medium=email&session_token=SECRET&gclid=abc",
    );
    expect(path).toBe("/pricing");
    expect(urlQuery).toEqual({ utm_source: "news", utm_medium: "email" });
    expect(queryKeys).toContain("gclid");
    expect(queryKeys).toContain("session_token");
  });

  it("accepts bare paths", () => {
    expect(parseTrackedUrl("/docs?x=1").path).toBe("/docs");
    expect(parseTrackedUrl("/docs?x=1").urlQuery).toBeNull();
  });

  it("degrades gracefully on garbage", () => {
    expect(parseTrackedUrl("http://").path).toBe("/");
  });
});

describe("normalizePayload", () => {
  it("normalizes a full v2 payload", () => {
    const p = normalizePayload({
      site: "Example.COM",
      name: "pageview",
      url: "https://example.com/a?utm_campaign=launch",
      ref: "https://google.com/",
      title: "A",
      w: 1440,
      h: 900,
      lang: "en-US",
      vid: "abc123",
      props: { plan: "pro" },
    });
    expect(p).not.toBeNull();
    expect(p!.site).toBe("example.com");
    expect(p!.path).toBe("/a");
    expect(p!.utm.campaign).toBe("launch");
    expect(p!.referrer).toBe("https://google.com/");
    expect(p!.screenW).toBe(1440);
    expect(p!.props).toEqual({ plan: "pro" });
  });

  it("drops items missing site/name/url", () => {
    expect(normalizePayload({ name: "pageview", url: "/" })).toBeNull();
    expect(normalizePayload({ site: "a.com", url: "/" })).toBeNull();
    expect(normalizePayload({ site: "a.com", name: "pageview" })).toBeNull();
    expect(normalizePayload("nonsense")).toBeNull();
    expect(normalizePayload(null)).toBeNull();
  });

  it("drops oversized props but keeps the event", () => {
    const p = normalizePayload({
      site: "a.com",
      name: "signup",
      url: "/",
      props: { blob: "x".repeat(5000) },
    });
    expect(p).not.toBeNull();
    expect(p!.props).toBeNull();
  });
});

describe("normalizeBatch", () => {
  it("caps batches at MAX_BATCH_SIZE and filters invalid items", () => {
    const items = Array.from({ length: 60 }, (_, i) => ({
      site: "a.com",
      name: "pageview",
      url: `/p${i}`,
    }));
    expect(normalizeBatch(items)).toHaveLength(MAX_BATCH_SIZE);
    expect(normalizeBatch([{ bad: true }, items[0]])).toHaveLength(1);
  });

  it("wraps a single object", () => {
    expect(
      normalizeBatch({ site: "a.com", name: "pageview", url: "/" }),
    ).toHaveLength(1);
  });
});

describe("isLegacyPayload", () => {
  it("detects the legacy tracker shape", () => {
    expect(
      isLegacyPayload({ domain: "a.com", event: "pageview", url: "https://a.com/" }),
    ).toBe(true);
    expect(isLegacyPayload({ site: "a.com", name: "pageview", url: "/" })).toBe(false);
    expect(isLegacyPayload([{ site: "a.com" }])).toBe(false);
  });
});
