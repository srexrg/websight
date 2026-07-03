import { describe, expect, it } from "vitest";
import { isBot } from "@/lib/analytics/bot";

const CHROME_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

describe("isBot", () => {
  it("flags crawlers, tools, and headless browsers", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(true);
    expect(isBot("curl/8.6.0")).toBe(true);
    expect(isBot("python-requests/2.32.0")).toBe(true);
    expect(
      isBot(
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/126.0.0.0 Safari/537.36",
      ),
    ).toBe(true);
    expect(isBot("facebookexternalhit/1.1")).toBe(true);
    expect(isBot("GPTBot/1.0")).toBe(true);
  });

  it("treats missing or empty user agents as bots", () => {
    expect(isBot(null)).toBe(true);
    expect(isBot(undefined)).toBe(true);
    expect(isBot("   ")).toBe(true);
  });

  it("passes real browsers", () => {
    expect(isBot(CHROME_UA)).toBe(false);
    expect(isBot(IPHONE_UA)).toBe(false);
  });
});
