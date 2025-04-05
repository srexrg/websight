import Hero from "@/components/landing/hero";
import Features from "@/components/landing/Features";
import Footer from "@/components/landing/Footer";
import Navbar from "@/components/landing/Navbar";
import HowItWorks from "@/components/landing/HowItWorks";
import ComparisonSection from "@/components/landing/ComparisonSection";
import Cta from "@/components/landing/Cta";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-950 text-gray-100">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <ComparisonSection />
        <Cta />
      </main>
      <Footer />
    </div>
  );
}
