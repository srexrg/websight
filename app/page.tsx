import type { Metadata } from "next";
import { DATA } from "@/data/site.config";
import { faqs } from "@/lib/landing/content";
import { JsonLd } from "@/components/seo/json-ld";
import {
  organizationJsonLd,
  webSiteJsonLd,
  softwareApplicationJsonLd,
  faqPageJsonLd,
} from "@/lib/seo";
import AnnouncementBar from "@/components/landing/AnnouncementBar";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/hero";
import Features from "@/components/landing/Features";
import GlobeHighlight from "@/components/landing/GlobeHighlight";
import RealtimeHighlight from "@/components/landing/RealtimeHighlight";
import Install from "@/components/landing/Install";
import Comparison from "@/components/landing/Comparison";
import Pricing from "@/components/landing/Pricing";
import Faq from "@/components/landing/Faq";
import FinalCta from "@/components/landing/FinalCta";
import Footer from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: {
    absolute: "WebSight - Open-Source, Privacy-First Web Analytics",
  },
  description: DATA.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: "WebSight - Open-Source, Privacy-First Web Analytics",
    description: DATA.description,
    url: "/",
    siteName: DATA.name,
    type: "website",
    images: [{ url: DATA.prevImage }],
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-page text-foreground">
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={webSiteJsonLd()} />
      <JsonLd data={softwareApplicationJsonLd()} />
      <JsonLd data={faqPageJsonLd(faqs)} />
      <AnnouncementBar />
      <Navbar />
      <main>
        <Hero />
        <Features />
        <GlobeHighlight />
        <RealtimeHighlight />
        <Install />
        <Comparison />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
