/**
 * Unit tests for the BUILT tracker (public/t.js) running in isolated jsdom
 * pages - config, transport batching, SPA pageviews, auto-capture, privacy
 * modes, guards, and the gzipped size budget (docs/redesign/01).
 */
import { readFileSync } from "fs";
import path from "path";
import { gzipSync } from "zlib";
import { describe, expect, it } from "vitest";
import { bootTracker, click } from "../helpers/tracker-dom";

const SIZE_BUDGET = 3072; // hard budget from docs/redesign/01

describe("size budget", () => {
  it("core t.js stays under 3KB gzipped", () => {
    const gz = gzipSync(readFileSync(path.join(process.cwd(), "public/t.js"))).length;
    expect(gz).toBeLessThan(SIZE_BUDGET);
  });
});

describe("boot + pageview", () => {
  it("sends the initial pageview immediately with the full payload shape", () => {
    const page = bootTracker({
      url: "https://example.com/pricing?utm_source=news&gclid=abc&secret=1",
    });
    expect(page.beacons).toHaveLength(1);
    const [ev] = page.events();
    expect(ev.name).toBe("pageview");
    expect(ev.site).toBe("example.com");
    // query stripped client-side except utm_* and click ids
    expect(ev.url).toBe("/pricing?utm_source=news&gclid=abc");
    expect(ev.sdk).toBe("js@2.0.0");
    expect(ev.lang).toBeTruthy();
    expect(ev.ts).toBeTypeOf("number");
    expect(ev.vid).toBeUndefined(); // stateless default: no client identity
  });

  it("resolves the endpoint from the script origin and honors data-api", () => {
    const a = bootTracker({});
    expect(a.beacons[0].url).toBe("https://app.websight.test/api/track");
    const b = bootTracker({ attrs: { site: "example.com", api: "https://own.example.com/api/track" } });
    expect(b.beacons[0].url).toBe("https://own.example.com/api/track");
  });

  it("guards against duplicate script tags", () => {
    const page = bootTracker({});
    page.window.eval(readFileSync(path.join(process.cwd(), "public/t.js"), "utf8"));
    expect(page.beacons).toHaveLength(1); // second eval is a no-op
  });
});

describe("transport batching", () => {
  it("batches after the first event and flushes at 3", () => {
    const page = bootTracker({});
    const ws = page.window.websight as { track: (n: string, p?: object) => void };
    ws.track("one");
    expect(page.beacons).toHaveLength(1); // still only the initial pageview
    ws.track("two");
    ws.track("three");
    expect(page.beacons).toHaveLength(2); // queue hit 3 -> flushed as array
    const batch = JSON.parse(page.beacons[1].body);
    expect(batch.map((e: { name: string }) => e.name)).toEqual(["one", "two", "three"]);
  });

  it("flushes the queue when the page is hidden", () => {
    const page = bootTracker({});
    (page.window.websight as { track: (n: string) => void }).track("pending");
    expect(page.beacons).toHaveLength(1);
    page.hide();
    expect(page.beacons).toHaveLength(2);
    expect(page.events().at(-1)!.name).toBe("pending");
  });

  it("falls back to fetch keepalive when sendBeacon fails", () => {
    const fetchSink: { url: string; body: string }[] = [];
    bootTracker({ sendBeaconResult: false, fetchSink });
    expect(fetchSink).toHaveLength(1);
    expect(JSON.parse(fetchSink[0].body).name).toBe("pageview");
  });
});

describe("SPA navigation", () => {
  it("tracks pushState navigations and dedupes identical URLs", () => {
    const page = bootTracker({});
    page.window.history.pushState({}, "", "/docs");
    page.window.history.replaceState({}, "", "/docs"); // same URL: deduped
    page.hide();
    const views = page.events().filter((e) => e.name === "pageview");
    expect(views.map((v) => v.url)).toEqual(["/", "/docs"]);
  });

  it("skips excluded paths via data-exclude globs", () => {
    const page = bootTracker({ attrs: { site: "example.com", exclude: "/admin/*, /health" } });
    page.window.history.pushState({}, "", "/admin/users");
    page.window.history.pushState({}, "", "/health");
    page.window.history.pushState({}, "", "/ok");
    page.hide();
    const views = page.events().filter((e) => e.name === "pageview");
    expect(views.map((v) => v.url)).toEqual(["/", "/ok"]);
  });
});

describe("auto-capture", () => {
  it("captures outbound clicks, downloads, and data-ws-event elements", () => {
    const page = bootTracker({
      html: `
        <a id="out" href="https://other.example.net/x">out</a>
        <a id="in" href="/internal">in</a>
        <a id="dl" href="/files/report.pdf">dl</a>
        <button id="cta" data-ws-event="signup">go</button>`,
    });
    click(page, page.document.getElementById("out")!);
    click(page, page.document.getElementById("in")!);
    click(page, page.document.getElementById("dl")!);
    click(page, page.document.getElementById("cta")!);
    page.hide();
    const names = page.events().map((e) => e.name);
    expect(names).toContain("outbound_click");
    expect(names).toContain("download");
    expect(names).toContain("signup");
    const out = page.events().find((e) => e.name === "outbound_click")!;
    expect((out.props as { url: string }).url).toBe("https://other.example.net/x");
    // internal non-download link produced nothing extra
    expect(page.events()).toHaveLength(4); // pageview + outbound + download + signup
  });

  it("respects data-track-outbound=false", () => {
    const page = bootTracker({
      attrs: { site: "example.com", "track-outbound": "false" },
      html: `<a id="out" href="https://other.example.net/">out</a>`,
    });
    click(page, page.document.getElementById("out")!);
    page.hide();
    expect(page.events().map((e) => e.name)).toEqual(["pageview"]);
  });

  it("captures form submissions with the form id", () => {
    const page = bootTracker({ html: `<form id="waitlist"><input></form>` });
    page.document.getElementById("waitlist")!.dispatchEvent(
      new page.window.Event("submit", { bubbles: true, cancelable: true }),
    );
    page.hide();
    const ev = page.events().find((e) => e.name === "form_submit")!;
    expect((ev.props as { form: string }).form).toBe("waitlist");
  });
});

describe("privacy modes + identify", () => {
  it("persistent mode mints a stable vid and identify() attaches uid", () => {
    const page = bootTracker({ attrs: { site: "example.com", mode: "persistent" } });
    const first = page.events()[0];
    expect(first.vid).toBeTypeOf("string");
    expect(page.window.localStorage.getItem("websight_vid")).toBe(first.vid);

    const ws = page.window.websight as {
      track: (n: string) => void;
      identify: (id: string, t?: object) => void;
    };
    ws.identify("user-42", { plan: "pro" });
    ws.track("after-identify");
    page.hide();
    const ev = page.events().find((e) => e.name === "after-identify")!;
    expect(ev.uid).toBe("user-42");
    expect(page.events().find((e) => e.name === "identify")).toBeTruthy();
    expect(page.window.localStorage.getItem("websight_uid")).toBe("user-42");
  });

  it("identify() is a no-op in stateless mode", () => {
    const page = bootTracker({});
    const ws = page.window.websight as { track: (n: string) => void; identify: (id: string) => void };
    ws.identify("user-42");
    ws.track("x");
    page.hide();
    expect(page.events().find((e) => e.name === "x")!.uid).toBeUndefined();
    expect(page.window.localStorage.getItem("websight_uid")).toBeNull();
  });
});

describe("guards", () => {
  it("does nothing on localhost but still installs a safe API", () => {
    const page = bootTracker({ url: "http://localhost:3000/" });
    const ws = page.window.websight as { track: (n: string) => void };
    ws.track("x");
    page.hide();
    expect(page.beacons).toHaveLength(0);
  });

  it("honors the websight_ignore flag (site-owner self-exclusion)", () => {
    const page = bootTracker({
      preBoot: (win) => win.localStorage.setItem("websight_ignore", "1"),
    });
    (page.window.websight as { track: (n: string) => void }).track("x");
    page.hide();
    expect(page.beacons).toHaveLength(0);
  });

  it("honors doNotTrack only when the site opts in", () => {
    const withOptIn = bootTracker({ attrs: { site: "example.com", "respect-dnt": "" } });
    // jsdom has no doNotTrack, so opt-in alone must NOT disable tracking
    expect(withOptIn.beacons).toHaveLength(1);
  });

  it("replays the pre-init stub queue", () => {
    const page = bootTracker({
      preBoot: (win) =>
        win.eval(
          `window.websight = window.websight || function(){(window.websight.q=window.websight.q||[]).push(arguments)};` +
            `window.websight('track', 'queued-event', {early: true});`,
        ),
    });
    page.hide();
    const ev = page.events().find((e) => e.name === "queued-event")!;
    expect(ev).toBeTruthy();
    expect((ev.props as { early: boolean }).early).toBe(true);
    expect(page.events().some((e) => e.name === "pageview")).toBe(true);
  });
});

describe("extension chunk", () => {
  it("loads t-x.js only when data-vitals/data-errors are set and reports errors", () => {
    const plain = bootTracker({});
    expect(plain.document.querySelector('script[src*="t-x.js"]')).toBeNull();

    const page = bootTracker({ attrs: { site: "example.com", errors: "" } });
    const ext = page.document.querySelector('script[src*="t-x.js"]');
    expect(ext).toBeTruthy();
    expect((ext as HTMLScriptElement).src).toBe("https://app.websight.test/t-x.js");

    page.loadExtension();
    page.window.dispatchEvent(
      new page.window.ErrorEvent("error", { message: "boom", filename: "app.js", lineno: 3 }),
    );
    page.hide();
    const ev = page.events().find((e) => e.name === "error")!;
    expect(ev).toBeTruthy();
    expect((ev.props as { message: string }).message).toBe("boom");
  });
});
