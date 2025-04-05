"use client"
import Link from "next/link";
import { ArrowLeft, ChevronRight, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CustomEventsPage() {
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
              <span className="text-white">Custom Events</span>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div>
              <h1 className="text-4xl font-bold mb-6 text-white">
                Custom Events Guide
              </h1>
              
              <div className="prose prose-invert max-w-none">
                <h2 className="text-2xl font-semibold text-white mt-8 mb-4">Track Custom User Interactions</h2>
                <p className="text-gray-300 text-lg mb-8">
                  Learn how to track specific user interactions and events that matter most to your business using WebSight's custom events API.
                </p>

                <div className="space-y-12">
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-white">Basic Event Tracking</h3>
                    <p className="text-gray-300">
                      Track custom events by calling the <code className="bg-zinc-800 px-2 py-1 rounded text-sm text-gray-200">websight.track()</code> function. This function accepts an event name and optional properties.
                    </p>
                    <div className="relative">
                      <pre className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                        <code className="text-gray-200">
{`websight.track('button_click', {
  buttonId: 'signup',
  location: 'header'
});`}
                        </code>
                      </pre>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-3 right-3 text-gray-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-700/50"
                        onClick={() => navigator.clipboard.writeText("websight.track('button_click', {\n  buttonId: 'signup',\n  location: 'header'\n});")}
                      >
                        <CopyIcon className="h-4 w-4 cursor-pointer" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-white">Common Use Cases</h3>
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-lg font-medium text-white mb-2">Form Submissions</h4>
                        <div className="relative">
                          <pre className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                            <code className="text-gray-200">
{`// Track form submissions
form.addEventListener('submit', (e) => {
  websight.track('form_submit', {
    formId: 'contact_form',
    formType: 'contact',
    success: true
  });
});`}
                            </code>
                          </pre>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-3 right-3 text-gray-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-700/50"
                            onClick={() => navigator.clipboard.writeText("form.addEventListener('submit', (e) => {\n  websight.track('form_submit', {\n    formId: 'contact_form',\n    formType: 'contact',\n    success: true\n  });\n});")}
                          >
                            <CopyIcon className="h-4 w-4 cursor-pointer" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-lg font-medium text-white mb-2">User Actions</h4>
                        <div className="relative">
                          <pre className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 overflow-x-auto">
                            <code className="text-gray-200">
{`// Track user interactions
websight.track('video_play', {
  videoId: 'intro-video',
  duration: 120,
  position: 0
});

websight.track('product_view', {
  productId: 'prod_123',
  category: 'electronics',
  price: 299.99
});`}
                            </code>
                          </pre>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-3 right-3 text-gray-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-700/50"
                            onClick={() => navigator.clipboard.writeText("websight.track('video_play', {\n  videoId: 'intro-video',\n  duration: 120,\n  position: 0\n});\n\nwebsight.track('product_view', {\n  productId: 'prod_123',\n  category: 'electronics',\n  price: 299.99\n});")}
                          >
                            <CopyIcon className="h-4 w-4 cursor-pointer" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-white">Best Practices</h3>
                    <ul className="space-y-2 text-gray-300 list-disc pl-4">
                      <li>Use consistent event names across your application</li>
                      <li>Keep property names clear and descriptive</li>
                      <li>Include relevant contextual data with each event</li>
                      <li>Validate event tracking in development before deploying</li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-white">Viewing Event Data</h3>
                    <p className="text-gray-300">
                      Custom events data can be viewed in your WebSight dashboard under the Events section. You can:
                    </p>
                    <ul className="space-y-2 text-gray-300 list-disc pl-4">
                      <li>Filter events by name, date range, and properties</li>
                      <li>View event trends and patterns</li>
                      <li>Export event data for further analysis</li>
                      <li>Set up custom alerts based on event triggers</li>
                    </ul>
                    <Link href="/dashboard">
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white mt-4">
                        View Events Dashboard
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* <div className="mt-12 p-6 bg-zinc-900/50 rounded-lg border border-zinc-800">
                  <h3 className="text-lg font-semibold text-white mb-2">Looking for More?</h3>
                  <p className="text-gray-300 mb-4">
                    Check out these additional resources for advanced event tracking:
                  </p>
                  <ul className="space-y-2 text-gray-300 list-disc pl-4">
                    <li><Link href="/docs/api" className="text-blue-400 hover:underline">Full API Reference</Link></li>
                    <li><Link href="/docs/examples" className="text-blue-400 hover:underline">Code Examples</Link></li>
                    <li><Link href="/contact" className="text-blue-400 hover:underline">Contact Support</Link></li>
                  </ul>
                </div> */}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}