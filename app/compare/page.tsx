import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { comparisons } from "@/lib/compare/content";

export const metadata: Metadata = {
  title: { absolute: "Compare WebSight to other analytics tools" },
  description:
    "Honest comparisons of WebSight against Google Analytics, Plausible and Umami. See where each web analytics tool wins on privacy, features, hosting and price.",
  alternates: { canonical: "/compare" },
  openGraph: {
    title: "Compare WebSight to other analytics tools",
    description:
      "Honest comparisons of WebSight against Google Analytics, Plausible and Umami. See where each web analytics tool wins on privacy, features, hosting and price.",
    url: "/compare",
    type: "website",
    images: ["/prev.png"],
  },
};

const teasers: Record<string, string> = {
  "google-analytics":
    "Cookieless and under 1 KB, versus the industry standard with deep Google Ads and BigQuery integration.",
  plausible:
    "Two privacy-first, open-source tools compared. WebSight adds session replay and a free hosted tier.",
  umami:
    "Both MIT-licensed and cookieless. See where WebSight's deeper dashboard differs from Umami's lean one.",
};

export default function CompareHub() {
  return (
    <div className="min-h-screen bg-page text-foreground">
      <Navbar />
      <main>
        <section>
          <div className="max-w-[820px] mx-auto px-7 pt-[72px] pb-[16px] text-center">
            <span className="text-[13px] font-bold tracking-[0.6px] text-brand uppercase">
              Compare
            </span>
            <h1 className="text-[44px] font-extrabold tracking-[-1.4px] leading-[1.08] mt-3 mb-[18px] text-foreground">
              How WebSight compares
            </h1>
            <p className="text-[18px] leading-[1.55] text-muted-foreground max-w-[640px] mx-auto m-0">
              Choosing a web analytics tool comes down to a few things: how it
              treats visitor privacy, who owns the data, how much weight the
              script adds to your pages, and whether the numbers are realtime.
              These comparisons lay out where WebSight wins and where the
              alternative might suit you better.
            </p>
          </div>
        </section>

        <section>
          <div className="max-w-[880px] mx-auto px-7 py-[56px]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {comparisons.map((c) => (
                <Link
                  key={c.slug}
                  href={`/compare/${c.slug}`}
                  className="group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_rgba(16,24,40,.04)] hover:border-brand/40 hover:shadow-sm transition-all"
                >
                  <h2 className="text-[19px] font-bold tracking-[-0.4px] text-foreground mb-2">
                    WebSight vs {c.competitor}
                  </h2>
                  <p className="text-[14px] leading-[1.55] text-muted-foreground m-0 flex-1">
                    {teasers[c.slug]}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-brand">
                    Read the comparison
                    <ArrowRight
                      size={14}
                      weight="bold"
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
