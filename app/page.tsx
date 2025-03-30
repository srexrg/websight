import Hero from "@/components/landing/hero";
import Features from "@/components/landing/Features";
import Testimonials from "@/components/landing/Testimonials";
import Footer from "@/components/landing/Footer";
import Navbar from "@/components/landing/Navbar";
import HowItWorks from "@/components/landing/HowItWorks";
import PricingSection from "@/components/landing/PricingSection";
import DashboardPreview from "@/components/landing/DashboardPreview";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-950 text-gray-100">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <DashboardPreview />
        <PricingSection />
        <Testimonials />
      </main>
      <Footer />
    </div>
  );
}
