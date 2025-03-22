import { Button } from "@/components/ui/button";
import Link from "next/link";


export function HeroSection() {
  return (
    <section className="flex flex-col items-center justify-center min-h-[90vh] p-8 bg-gradient-to-b from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
      <div className="max-w-4xl mx-auto text-center space-y-6">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent animate-fade-in">
          Simple analytics for modern websites
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in-up">
          Track pageviews, visits, and custom events without compromising user privacy
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8 animate-fade-in-up">
            <Link href="/auth">
          <Button size="lg" className="text-lg cursor-pointer">
            Start tracking for free
          </Button>
          </Link>
          <Button size="lg" variant="outline" className="text-lg cursor-pointer">
            View demo
          </Button>
        </div>
      </div>
    </section>
  );
}