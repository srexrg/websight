"use client"

import Link from "next/link";
import { ArrowLeft, Code, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";

const guides = [
  {
    title: "Quick Start Guide",
    description: "Get started with WebSight in under 5 minutes",
    icon: <LineChart className="h-6 w-6" />,
    href: "/docs/quickstart",
  },
  {
    title: "Custom Events Guide",
    description: "Learn how to track custom events and interactions",
    icon: <Code className="h-6 w-6" />,
    href: "/docs/custom-events",
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="fixed top-0 left-0 right-0 z-50 py-4 bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button 
                variant="ghost" 
                className="text-gray-600 hover:text-gray-900 gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
            <h1 className="text-xl font-semibold text-gray-900">Documentation</h1>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h1 className="text-4xl font-bold mb-4 text-gray-900">
              WebSight Documentation
            </h1>
            <p className="text-lg text-gray-600">
              Learn how to integrate and use WebSight analytics effectively
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {guides.map((guide) => (
              <Link key={guide.title} href={guide.href}>
                <div className="p-6 rounded-lg border hover:border-gray-300 transition-colors bg-white">
                  <div className="mb-4 p-3 w-fit rounded-lg bg-gray-50 text-gray-600">
                    {guide.icon}
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {guide.title}
                  </h2>
                  <p className="text-gray-600 text-sm">
                    {guide.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}