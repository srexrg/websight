"use client"
import Link from "next/link";
import { ArrowLeft, ChevronRight, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function QuickStartPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="fixed top-0 left-0 right-0 z-50 py-4 bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4">
            <Link href="/docs">
              <Button 
                variant="ghost" 
                className="text-gray-600 hover:text-gray-900 gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Docs
              </Button>
            </Link>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Link href="/docs" className="hover:text-gray-900 transition-colors">Docs</Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-gray-900">Quick Start Guide</span>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div>
              <h1 className="text-4xl font-bold mb-6 text-gray-900">
                Quick Start Guide
              </h1>
              
              <div className="prose prose-gray max-w-none">
                <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">Getting Started with WebSight</h2>
                <p className="text-gray-600 text-lg mb-8">
                  Follow these simple steps to add WebSight analytics to your website and start tracking visitor data in minutes.
                </p>

                <div className="space-y-12">
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-900">1. Create an Account</h3>
                    <p className="text-gray-600">
                      Sign up for a WebSight account if you haven't already. It's free to get started and no credit card is required.
                    </p>
                    <Link href="/auth">
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                        Create Account
                      </Button>
                    </Link>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-900">2. Add Your Website</h3>
                    <p className="text-gray-600">
                      Once logged in, add your website domain in the dashboard. You'll receive a unique tracking code for your site.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-900">3. Install Tracking Code</h3>
                    <p className="text-gray-600">
                      Add the following script to your website's <code className="bg-gray-100 px-2 py-1 rounded text-sm">&lt;head&gt;</code> section:
                    </p>
                    <div className="relative">
                      <pre className="bg-gray-50 border rounded-lg p-4 overflow-x-auto">
                        <code className="text-gray-800">
                          &lt;script src="https://websight.io/tracker.js" data-site="YOUR-SITE-ID"&gt;&lt;/script&gt;
                        </code>
                      </pre>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-3 right-3 text-gray-500 hover:text-gray-900"
                        onClick={() => navigator.clipboard.writeText('<script src="https://websight.io/tracker.js" data-site="YOUR-SITE-ID"></script>')}
                      >
                        <CopyIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-gray-900">4. Verify Installation</h3>
                    <p className="text-gray-600">
                      Return to your WebSight dashboard and verify that data is being collected. You should see your first analytics within minutes.
                    </p>
                    <Link href="/dashboard">
                      <Button variant="outline" className="border-gray-200 hover:bg-gray-50 text-gray-700">
                        Go to Dashboard
                      </Button>
                    </Link>
                  </div>
                </div>

                <h2 className="text-2xl font-semibold text-gray-900 mt-12 mb-4">Next Steps</h2>
                <ul className="space-y-2 text-gray-600 list-disc pl-4">
                  <li>Learn about <Link href="/docs/configuration" className="text-blue-600 hover:underline">configuring WebSight</Link> for your needs</li>
                  <li>Set up <Link href="/docs/api" className="text-blue-600 hover:underline">custom event tracking</Link></li>
                  <li>Read about our <Link href="/docs/privacy" className="text-blue-600 hover:underline">privacy features</Link></li>
                </ul>

                <div className="mt-12 p-6 bg-gray-50 rounded-lg border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Need Help?</h3>
                  <p className="text-gray-600 mb-4">
                    If you're having trouble setting up WebSight or have questions, our support team is here to help.
                  </p>
                  <Link href="/contact">
                    <Button variant="outline" className="border-gray-200 hover:bg-gray-100 text-gray-700">
                      Contact Support
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}