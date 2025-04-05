"use client"

import Link from "next/link";
import { ArrowLeft, Code, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";

const guides = [
  {
    title: "Quick Start Guide",
    description: "Get started with WebSight in under 5 minutes",
    icon: <LineChart className="h-6 w-6 text-blue-500" />,
    href: "/docs/quickstart",
  },
  {
    title: "Custom Events Guide",
    description: "Learn how to track custom events and interactions",
    icon: <Code className="h-6 w-6 text-blue-500" />,
    href: "/docs/custom-events",
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_200px,#7c3aed15,transparent)]" />
        <div className="absolute top-1/4 left-20 w-64 h-64 bg-gradient-to-br from-blue-600/10 to-indigo-600/10 rounded-full filter blur-3xl" />
        <div className="absolute bottom-1/3 right-20 w-72 h-72 bg-gradient-to-br from-indigo-600/10 to-blue-600/10 rounded-full filter blur-3xl" />
      </div>
      
      <header className="fixed top-0 left-0 right-0 z-50 py-4 bg-black/50 backdrop-blur-sm border-b border-zinc-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button 
                variant="ghost" 
                className="text-gray-300 hover:text-white gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
            <h1 className="text-xl font-semibold text-white">Documentation</h1>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h1 className="text-4xl font-bold mb-4 text-white">
              WebSight Documentation
            </h1>
            <p className="text-lg text-gray-300">
              Learn how to integrate and use WebSight analytics effectively
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {guides.map((guide) => (
              <Link key={guide.title} href={guide.href}>
                <div className="p-6 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors bg-black/50 backdrop-blur-sm">
                  <div className="mb-4 p-3 w-fit rounded-lg bg-zinc-900/50 text-blue-500">
                    {guide.icon}
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-2">
                    {guide.title}
                  </h2>
                  <p className="text-gray-300 text-sm">
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