import { describe, expect, it } from "vitest";
import { resolveVisitorId, visitorHash } from "@/lib/analytics/identity";

const SITE = "0b6f4a4e-6c9f-4f6e-a1a1-000000000001";
const UA = "Mozilla/5.0 test";

describe("visitorHash", () => {
  it("is deterministic for identical inputs", () => {
    expect(visitorHash("salt1", SITE, "1.2.3.4", UA)).toBe(
      visitorHash("salt1", SITE, "1.2.3.4", UA),
    );
  });

  it("changes when the salt rotates (daily identity reset)", () => {
    expect(visitorHash("salt1", SITE, "1.2.3.4", UA)).not.toBe(
      visitorHash("salt2", SITE, "1.2.3.4", UA),
    );
  });

  it("differs across sites, ips, and user agents", () => {
    const base = visitorHash("s", SITE, "1.2.3.4", UA);
    expect(visitorHash("s", SITE.replace("1", "2"), "1.2.3.4", UA)).not.toBe(base);
    expect(visitorHash("s", SITE, "5.6.7.8", UA)).not.toBe(base);
    expect(visitorHash("s", SITE, "1.2.3.4", "other UA")).not.toBe(base);
  });

  it("emits a compact hex id (32 chars)", () => {
    expect(visitorHash("s", SITE, "1.2.3.4", UA)).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe("resolveVisitorId", () => {
  const base = {
    salt: "s",
    siteId: SITE,
    ip: "1.2.3.4",
    userAgent: UA,
  };

  it("uses the client vid in persistent mode", () => {
    expect(
      resolveVisitorId({ ...base, privacyMode: "persistent", vid: "client-id" }),
    ).toBe("client-id");
  });

  it("falls back to the hash when persistent mode has no vid", () => {
    expect(
      resolveVisitorId({ ...base, privacyMode: "persistent", vid: null }),
    ).toMatch(/^[0-9a-f]{32}$/);
  });

  it("ignores vid entirely in stateless mode", () => {
    expect(
      resolveVisitorId({ ...base, privacyMode: "stateless", vid: "client-id" }),
    ).toMatch(/^[0-9a-f]{32}$/);
  });
});
