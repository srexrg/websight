import AnnouncementBar from "@/components/landing/AnnouncementBar";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/hero";
import Features from "@/components/landing/Features";
import GlobeHighlight from "@/components/landing/GlobeHighlight";
import RealtimeHighlight from "@/components/landing/RealtimeHighlight";
import Install from "@/components/landing/Install";
import StatsBand from "@/components/landing/StatsBand";
import Comparison from "@/components/landing/Comparison";
import Pricing from "@/components/landing/Pricing";
import Testimonial from "@/components/landing/Testimonial";
import Faq from "@/components/landing/Faq";
import FinalCta from "@/components/landing/FinalCta";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-page text-foreground">
      <AnnouncementBar />
      <Navbar />
      <main>
        <Hero />
        <Features />
        <GlobeHighlight />
        <RealtimeHighlight />
        <Install />
        <StatsBand />
        <Comparison />
        <Pricing />
        <Testimonial />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
