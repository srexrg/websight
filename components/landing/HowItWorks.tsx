"use client"

import { motion } from 'framer-motion';
import { Code, RefreshCw, BarChart4, Zap } from 'lucide-react';

const HowItWorks = () => {
  const steps = [
    {
      icon: <Code className="h-6 w-6" />,
      title: "Add a Simple Script",
      description: "Just add our lightweight tracking script to your website with a single line of code. No complex setup required.",
      delay: 0.1
    },
    {
      icon: <RefreshCw className="h-6 w-6" />,
      title: "Collect Data Automatically",
      description: "WebSight automatically tracks visitor data, page views, and user interactions in real-time with minimal performance impact.",
      delay: 0.2
    },
    {
      icon: <BarChart4 className="h-6 w-6" />,
      title: "Analyze & Visualize",
      description: "View beautiful, intuitive visualizations and reports of your website traffic, user behavior, and conversion metrics.",
      delay: 0.3
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Optimize Performance",
      description: "Make data-driven decisions to optimize your website, improve user experience, and increase conversions.",
      delay: 0.4
    }
  ];

  return (
    <section 
      id="how-it-works" 
      className="relative py-32 bg-gradient-to-b from-black to-zinc-900 overflow-hidden"
      aria-label="How It Works Section"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_200px,#7c3aed10,transparent)]" />

      <div className="container relative mx-auto px-4 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-3xl mx-auto mb-24"
        >
          <h2 className="text-4xl md:text-6xl font-heading mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-violet-200 to-violet-500">
            How WebSight Works
            <span className="block mt-3 text-gray-300 text-2xl md:text-3xl font-title">
              Start Tracking in Minutes
            </span>
          </h2>
          <p className="text-gray-400 text-lg md:text-xl font-light tracking-wide max-w-2xl mx-auto">
            Get started with powerful analytics in just a few simple steps
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-6 lg:gap-8 relative">
          {/* Connecting Lines */}
          <div className="absolute top-[45%] left-0 w-full h-px bg-gradient-to-r from-violet-500/20 via-indigo-500/20 to-violet-500/20 hidden lg:block" />
          
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.5, 
                delay: index * 0.15,
                ease: "easeOut"
              }}
            >
              <div className="group h-full bg-zinc-900/40 hover:bg-zinc-900/60 transition-all duration-500 backdrop-blur-xl border-0 rounded-2xl p-8">
                <div className="flex flex-col gap-8">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/30 flex items-center justify-center shadow-lg shadow-black/40">
                      <div className="text-violet-400 group-hover:scale-110 group-hover:text-violet-300 transition-all duration-500">
                        {step.icon}
                      </div>
                    </div>
                    {/* Step number */}
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                      <span className="text-violet-400 text-sm font-medium">{index + 1}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-xl font-medium text-white tracking-tight group-hover:text-violet-300 transition-colors duration-500">
                      {step.title}
                    </h3>
                    <p className="text-gray-400 leading-relaxed text-sm">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Code Block */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-20 max-w-3xl mx-auto"
        >
          <div className="bg-zinc-900/40 backdrop-blur-xl border border-violet-500/10 rounded-xl overflow-hidden">
            <div className="flex items-center bg-zinc-900/60 px-4 py-2 border-b border-violet-500/10">
              <div className="flex space-x-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/70"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/70"></div>
              </div>
              <span className="ml-3 text-sm text-gray-400">tracking-script.js</span>
            </div>
            <div className="p-6 text-sm font-mono text-gray-300 overflow-x-auto">
              <pre className="whitespace-pre">
                <span className="text-violet-400">{"<script "}</span>
                <span className="text-indigo-400">src</span>
                <span className="text-violet-400">{"="}</span>
                <span className="text-emerald-400">"https://websight.io/tracker.js"</span> 
                <span className="text-indigo-400">{" data-key"}</span>
                <span className="text-violet-400">{"="}</span>
                <span className="text-emerald-400">"YOUR_API_KEY"</span>
                <span className="text-violet-400">{"></script>"}</span>
              </pre>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;