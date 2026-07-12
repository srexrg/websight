import { source } from "@/lib/source";
import {
  DocsPage,
  DocsBody,
  DocsDescription,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import { notFound } from "next/navigation";
import { createRelativeLink } from "fumadocs-ui/mdx";
import { getMDXComponents } from "@/components/mdx";
import type { Metadata } from "next";
import { DATA } from "@/data/site.config";
import { JsonLd } from "@/components/seo/json-ld";
import { techArticleJsonLd, breadcrumbJsonLd } from "@/lib/seo";

/** Turn a slug segment like "getting-started" into "Getting Started". */
function humanizeSegment(segment: string): string {
  return segment
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Build breadcrumb items: a leading "Docs" entry, then one entry per slug
 * segment with cumulative absolute urls. Intermediate segments are humanized;
 * the final segment uses the page title.
 */
function buildBreadcrumbItems(
  slug: string[] | undefined,
  pageTitle: string
): { name: string; url: string }[] {
  const items = [{ name: "Docs", url: `${DATA.url}/docs` }];
  const segments = slug ?? [];
  let path = "/docs";
  segments.forEach((segment, index) => {
    path = `${path}/${segment}`;
    const isLast = index === segments.length - 1;
    items.push({
      name: isLast ? pageTitle : humanizeSegment(segment),
      url: `${DATA.url}${path}`,
    });
  });
  return items;
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const MDXContent = page.data.body;
  const breadcrumbItems = buildBreadcrumbItems(slug, page.data.title);

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <JsonLd
        data={techArticleJsonLd({
          title: page.data.title,
          description: page.data.description,
          url: `${DATA.url}${page.url}`,
        })}
      />
      <JsonLd data={breadcrumbJsonLd(breadcrumbItems)} />
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDXContent
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
    alternates: { canonical: page.url },
    openGraph: {
      title: page.data.title,
      description: page.data.description,
      url: page.url,
      type: "article",
      images: [DATA.prevImage],
    },
    twitter: {
      card: "summary_large_image",
      title: page.data.title,
      description: page.data.description,
    },
  };
}
