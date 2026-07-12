import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, X } from "@phosphor-icons/react/dist/ssr";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { LogoMark } from "@/components/brand/Logo";
import { DATA } from "@/data/site.config";
import { JsonLd } from "@/components/seo/json-ld";
import { faqPageJsonLd } from "@/lib/seo";
import {
  comparisons,
  type CompareCell,
  type Comparison,
} from "@/lib/compare/content";

export const dynamicParams = false;

export function generateStaticParams() {
  return comparisons.map((c) => ({ slug: c.slug }));
}

function getComparison(slug: string): Comparison | undefined {
  return comparisons.find((c) => c.slug === slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const c = getComparison(slug);
  if (!c) return {};
  const url = `${DATA.url}/compare/${c.slug}`;
  return {
    title: { absolute: c.metaTitle },
    description: c.metaDescription,
    alternates: { canonical: `/compare/${c.slug}` },
    openGraph: {
      title: c.metaTitle,
      description: c.metaDescription,
      url,
      type: "article",
      images: [DATA.prevImage],
    },
    twitter: {
      card: "summary_large_image",
      title: c.metaTitle,
      description: c.metaDescription,
      images: [DATA.prevImage],
    },
  };
}

/** Renders one comparison cell in the same treatment as the landing table. */
function Cell({ value, highlight = false }: { value: CompareCell; highlight?: boolean }) {
  if (value === true) {
    return <Check size={16} weight="bold" className={highlight ? "text-brand" : "text-muted-foreground"} />;
  }
  if (value === false) {
    return <X size={14} weight="bold" className="text-muted-foreground/40" />;
  }
  return (
    <span className={`text-[13px] ${highlight ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
      {value}
    </span>
  );
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = getComparison(slug);
  if (!c) notFound();

  const url = `${DATA.url}/compare/${c.slug}`;
  const others = comparisons.filter((o) => o.slug !== c.slug);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: c.metaTitle,
    description: c.metaDescription,
    url,
    author: { "@type": "Organization", name: "WebSight", url: DATA.url },
    publisher: { "@type": "Organization", name: "WebSight", url: DATA.url },
  };

  return (
    <div className="min-h-screen bg-page text-foreground">
      <JsonLd data={faqPageJsonLd(c.faqs)} />
      <JsonLd data={articleJsonLd} />
      <Navbar />

      <main>
        {/* Hero */}
        <section>
          <div className="max-w-[820px] mx-auto px-7 pt-[72px] pb-[40px] text-center">
            <span className="text-[13px] font-bold tracking-[0.6px] text-brand uppercase">
              Comparison
            </span>
            <h1 className="text-[44px] font-extrabold tracking-[-1.4px] leading-[1.08] mt-3 mb-[18px] text-foreground">
              {c.heroTitle}
            </h1>
            <p className="text-[18px] leading-[1.55] text-muted-foreground max-w-[640px] mx-auto m-0">
              {c.heroIntro}
            </p>
          </div>
        </section>

        {/* Feature table */}
        <section>
          <div className="max-w-[880px] mx-auto px-7 pb-[64px]">
            <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]">
              <table className="w-full min-w-[520px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-5 py-4" aria-label="Feature" />
                    <th className="bg-accent/50 px-5 py-4">
                      <span className="flex items-center gap-2 text-[13.5px] font-bold text-foreground">
                        <LogoMark size={20} /> WebSight
                      </span>
                    </th>
                    <th className="px-5 py-4 text-[13.5px] font-semibold text-muted-foreground">
                      {c.competitor}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {c.rows.map((row) => (
                    <tr key={row.label} className="border-b border-border/60 last:border-b-0">
                      <td className="px-5 py-3 text-[13px] font-medium text-foreground">{row.label}</td>
                      <td className="bg-accent/50 px-5 py-3">
                        <Cell value={row.websight} highlight />
                      </td>
                      <td className="px-5 py-3">
                        <Cell value={row.competitor} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Why teams pick WebSight */}
        <section className="bg-card/50 border-y border-border">
          <div className="max-w-[880px] mx-auto px-7 py-[72px]">
            <h2 className="text-[32px] font-extrabold tracking-[-1px] leading-[1.1] mb-[36px] text-foreground">
              Why teams pick WebSight
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
              {c.whyWebsight.map((s) => (
                <div key={s.title}>
                  <h3 className="text-[16px] font-bold text-foreground mb-2">{s.title}</h3>
                  <p className="text-[14.5px] leading-[1.6] text-muted-foreground m-0">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* When the competitor is the better fit */}
        <section>
          <div className="max-w-[880px] mx-auto px-7 py-[72px]">
            <h2 className="text-[32px] font-extrabold tracking-[-1px] leading-[1.1] mb-3 text-foreground">
              When {c.competitor} is the better fit
            </h2>
            <p className="text-[15px] leading-[1.55] text-muted-foreground max-w-[600px] mb-[36px]">
              No tool wins on everything. Here is when {c.competitor} is genuinely the right call.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
              {c.whyCompetitor.map((s) => (
                <div key={s.title}>
                  <h3 className="text-[16px] font-bold text-foreground mb-2">{s.title}</h3>
                  <p className="text-[14.5px] leading-[1.6] text-muted-foreground m-0">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ - plain, fully rendered, not an accordion */}
        <section className="bg-card/50 border-y border-border">
          <div className="max-w-[720px] mx-auto px-7 py-[72px]">
            <h2 className="text-[32px] font-extrabold tracking-[-1px] leading-[1.1] mb-[36px] text-foreground">
              Frequently asked
            </h2>
            <div className="flex flex-col gap-8">
              {c.faqs.map((f) => (
                <div key={f.q}>
                  <h3 className="text-[16px] font-semibold text-foreground mb-2">{f.q}</h3>
                  <p className="text-[14.5px] leading-[1.6] text-muted-foreground m-0">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section>
          <div className="max-w-[720px] mx-auto px-7 py-[80px] text-center">
            <h2 className="text-[34px] font-extrabold tracking-[-1.1px] leading-[1.1] mb-3 text-foreground">
              Try WebSight on your own site
            </h2>
            <p className="text-[16px] leading-[1.55] text-muted-foreground max-w-[480px] mx-auto mb-[28px]">
              Free and open source. No card, no cookie banner. Live in about 30 seconds.
            </p>
            <div className="flex items-center justify-center gap-[13px] flex-wrap">
              <Link
                href="/auth"
                className="flex items-center gap-2 bg-brand text-white text-[15px] font-semibold px-[24px] py-[13px] rounded-[12px] shadow-[0_6px_20px_rgba(14,156,110,0.28)] hover:bg-brand/90 transition-colors"
              >
                Start for free
                <ArrowRight size={16} weight="bold" />
              </Link>
              <Link
                href="/docs/getting-started/quickstart"
                className="flex items-center gap-2 bg-card text-foreground border border-border text-[15px] font-semibold px-6 py-[13px] rounded-[12px] hover:border-brand/40 hover:shadow-sm transition-all"
              >
                Read the quickstart
              </Link>
            </div>
          </div>
        </section>

        {/* Other comparisons */}
        <section className="border-t border-border">
          <div className="max-w-[880px] mx-auto px-7 py-[44px]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="text-[13px] font-bold tracking-[0.5px] text-muted-foreground uppercase">
                Other comparisons
              </span>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {others.map((o) => (
                  <Link
                    key={o.slug}
                    href={`/compare/${o.slug}`}
                    className="text-[14px] font-semibold text-foreground/80 hover:text-brand transition-colors"
                  >
                    WebSight vs {o.competitor}
                  </Link>
                ))}
                <Link
                  href="/compare"
                  className="text-[14px] font-semibold text-brand hover:underline"
                >
                  All comparisons
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
