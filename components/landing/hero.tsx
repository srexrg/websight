"use client"

import { Button } from "@/components/ui/button";
import { ArrowRight, LineChart, Sparkles, Users, Globe, Check } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

const Hero = () => {
  return (
    <section className="pt-24 pb-20 md:pt-32 md:pb-32 relative overflow-hidden bg-black">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_200px,#7c3aed15,transparent)]" />
        <motion.div 
          className="absolute top-1/4 left-20 w-64 h-64 bg-gradient-to-br from-violet-600/10 to-indigo-600/10 rounded-full filter blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-1/3 right-20 w-72 h-72 bg-gradient-to-br from-indigo-600/10 to-violet-600/10 rounded-full filter blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.6, 0.3, 0.6] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <motion.h1 
            className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            The modern analytics platform<br />
            for effortless insights.
          </motion.h1>
          
          <motion.p 
            className="text-lg md:text-xl text-gray-300 mb-8 md:mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            WebSight makes it easy to collect, analyze, and understand your website data — so you can focus on <span className="text-violet-400">growth</span>
          </motion.p>
          
          {/* CTA Buttons */}
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Link href="/auth">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 h-auto text-base rounded-md shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300">
                Get started
              </Button>
            </Link>
            <Button variant="outline" className="bg-zinc-900/80 hover:bg-zinc-800/90 backdrop-blur-xl text-gray-200 hover:text-white border-zinc-700 hover:border-zinc-600 px-8 py-6 h-auto text-base rounded-md transition-all duration-300">
              View demo
            </Button>
          </motion.div>
        </div>

        {/* Dashboard Preview */}
        <motion.div
          className="relative mx-auto max-w-5xl mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="absolute -z-10 inset-0 bg-gradient-to-tr from-violet-500/30 to-indigo-500/30 blur-2xl rounded-2xl"></div>
          
          <motion.div 
            className="rounded-2xl overflow-hidden shadow-2xl border border-violet-500/20 backdrop-blur-sm bg-zinc-900/60"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.5 }}
          >
            <img 
              src="/dashboard-preview.png" 
              alt="Analytics Dashboard"
              className="w-full opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
          </motion.div>
        </motion.div>

        {/* Company Logos */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <p className="text-sm text-gray-400 mb-8">Trusted by thousands of companies</p>
          <div className="flex justify-center items-center gap-12 flex-wrap opacity-60">
            <img src="/logos/espn.svg" alt="ESPN" className="h-6 grayscale " />
            <img src="/logos/siemens.svg" alt="Siemens" className="h-8 grayscale" />
            <img src="/logos/intel.svg" alt="Intel" className="h-8 grayscale" />
            <img src="/logos/hulu.svg" alt="Hulu" className="h-6 grayscale" />
            <img src="/logos/vsp.svg" alt="VSP" className="h-6 grayscale" />
            <img src="/logos/amd.svg" alt="AMD" className="h-6 grayscale" />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;