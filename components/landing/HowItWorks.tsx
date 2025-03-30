"use client"

import { motion } from 'framer-motion';
import { Code, RefreshCw, BarChart4, Zap } from 'lucide-react';

const HowItWorks = () => {
  const steps = [
    {
      icon: <Code className="h-6 w-6" />,
      title: "Add a Simple Script",
      description: "Just add our lightweight tracking script to your website with a single line of code. No complex setup required.",
      color: "from-blue-500 to-indigo-600",
      delay: 0.1
    },
    {
      icon: <RefreshCw className="h-6 w-6" />,
      title: "Collect Data Automatically",
      description: "WebSight automatically tracks visitor data, page views, and user interactions in real-time with minimal performance impact.",
      color: "from-indigo-600 to-purple-600",
      delay: 0.2
    },
    {
      icon: <BarChart4 className="h-6 w-6" />,
      title: "Analyze & Visualize",
      description: "View beautiful, intuitive visualizations and reports of your website traffic, user behavior, and conversion metrics.",
      color: "from-purple-600 to-pink-600",
      delay: 0.3
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Optimize Performance",
      description: "Make data-driven decisions to optimize your website, improve user experience, and increase conversions.",
      color: "from-pink-600 to-blue-500",
      delay: 0.4
    }
  ];

  return (
    <section id="how-it-works" className="py-24 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/10 to-transparent"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] bg-repeat opacity-5"></div>
      </div>
      
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-sm uppercase font-semibold tracking-wider text-purple-400 mb-3"
          >
            Simple Integration
          </motion.p>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
          >
            How WebSight Works
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-2xl mx-auto text-lg text-gray-400"
          >
            Get up and running in minutes with our easy-to-use analytics platform
          </motion.p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {/* Connecting line */}
          <div className="absolute top-1/3 left-0 w-full h-0.5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hidden lg:block"></div>
          
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: step.delay }}
              className="relative"
            >
              <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 h-full">
                <div className="mb-5 relative">
                  <div className={`absolute inset-0 bg-gradient-to-r ${step.color} blur-lg opacity-30`}></div>
                  <div className={`w-14 h-14 flex items-center justify-center rounded-full bg-gradient-to-r ${step.color} text-white relative z-10`}>
                    {step.icon}
                  </div>
                </div>
                
                <div className="lg:relative lg:z-10 bg-gray-900 lg:pb-4">
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-gray-400">{step.description}</p>
                </div>
                
                {/* Step number */}
                <div className="absolute -bottom-3 -right-3 w-10 h-10 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center text-purple-400 font-bold">
                  {index + 1}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Code example preview */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-20 max-w-3xl mx-auto rounded-xl overflow-hidden"
        >
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="flex items-center bg-gray-800 px-4 py-2">
              <div className="flex space-x-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <span className="ml-3 text-sm text-gray-400">tracking-script.js</span>
            </div>
            <div className="p-4 text-sm font-mono text-gray-300 overflow-x-auto">
              <pre className="whitespace-pre">
                <span className="text-purple-400">{"<script "}</span>
                <span className="text-blue-400">src</span>
                <span className="text-purple-400">{"="}</span>
                <span className="text-green-400">"https://websight.io/tracker.js"</span> 
                <span className="text-blue-400">{" data-key"}</span>
                <span className="text-purple-400">{"="}</span>
                <span className="text-green-400">"YOUR_API_KEY"</span>
                <span className="text-purple-400">{"></script>"}</span>
              </pre>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;