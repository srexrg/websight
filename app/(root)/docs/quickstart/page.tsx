"use client"
import Link from "next/link";
import { ArrowLeft, ChevronRight, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function QuickStartPage() {
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
            <Link href="/docs">
              <Button 
                variant="ghost" 
                className="text-gray-300 hover:text-white gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Docs
              </Button>
            </Link>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-white">Quick Start Guide</span>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div>
              <h1 className="text-4xl font-bold mb-6 text-white">
                Quick Start Guide
              </h1>
              
              <div className="prose prose-invert max-w-none">
                <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Getting Started with WebSight</h2>
                <p className="text-gray-300 text-lg mb-8">
                  Follow these simple steps to add WebSight analytics to your website and start tracking visitor data in minutes.
                </p>

                <div className="space-y-12">
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-white">1. Create an Account</h3>
                    <p className="text-gray-300">
                      Sign up for a WebSight account if you haven't already. It's free to get started and no credit card is required.
                    </p>
                    <Link href="/auth">
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                        Create Account
                      </Button>
                    </Link>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-white">2. Add Your Website</h3>
                    <p className="text-gray-300">
                      Once logged in, add your website domain in the dashboard. You'll receive a unique tracking code for your site.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-white">3. Install Tracking Code</h3>
                    <p className="text-gray-300">
                      Add the following script to your website's <code className="bg-zinc-800 px-2 py-1 rounded text-sm text-gray-200">&lt;head&gt;</code> section:
                    </p>
                    <div className="relative">
                      <pre className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                        <code className="text-gray-200">
                          &lt;script src="https://websight.io/tracker.js" data-site="YOUR-SITE-ID"&gt;&lt;/script&gt;
                        </code>
                      </pre>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-3 right-3 text-gray-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-700/50"
                        onClick={() => navigator.clipboard.writeText('<script src="https://websight.io/tracker.js" data-site="YOUR-SITE-ID"></script>')}
                      >
                        <CopyIcon className="h-4 w-4 cursor-pointer" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-white">4. Verify Installation</h3>
                    <p className="text-gray-300">
                      Return to your WebSight dashboard and verify that data is being collected. You should see your first analytics within minutes.
                    </p>
                    <Link href="/dashboard">
                      <Button variant="outline" className="border-none text-black cursor-pointer">
                        Go to Dashboard
                      </Button>
                    </Link>
                  </div>
                </div>

                <h2 className="text-2xl font-semibold text-white mt-12 mb-4">Next Steps</h2>
                <ul className="space-y-2 text-gray-300 list-disc pl-4">
                  <li>Set up <Link href="/docs/custom-events" className="text-blue-400 hover:underline">custom event tracking</Link></li>
                  {/* <li>Read about our <Link href="/docs/privacy" className="text-blue-400 hover:underline">privacy features</Link></li> */}
                </ul>

                {/* <div className="mt-12 p-6 bg-zinc-900/50 rounded-lg border border-zinc-800">
                  <h3 className="text-lg font-semibold text-white mb-2">Need Help?</h3>
                  <p className="text-gray-300 mb-4">
                    If you're having trouble setting up WebSight or have questions, our support team is here to help.
                  </p>
                  <Link href="/contact">
                    <Button variant="outline" className="border-zinc-800 hover:bg-zinc-800/50 text-gray-200">
                      Contact Support
                    </Button>
                  </Link>
                </div> */}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}