"use client"
import { Button } from "@/components/ui/button";
import { ArrowRight, LineChart, Sparkles, Users, Globe, Check } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

const Hero = () => {
  return (
    <section className="pt-32 pb-20 md:pt-48 md:pb-32 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-950/40 via-transparent to-purple-950/30"></div>
        <motion.div 
          className="absolute top-1/4 left-20 w-64 h-64 rounded-full bg-violet-500/20 filter blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-1/3 right-20 w-72 h-72 rounded-full bg-teal-500/10 filter blur-3xl"
          animate={{ scale: [1.2, 1, 1.2] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute top-1/2 right-1/4 w-56 h-56 rounded-full bg-amber-500/10 filter blur-3xl"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content Area */}
          <div className="order-2 lg:order-1">
            <motion.div 
              className="mb-6 inline-block px-4 py-1.5 rounded-full backdrop-blur-sm text-xs md:text-sm font-medium text-indigo-200 border border-indigo-500/20 bg-indigo-500/10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-block w-2 h-2 rounded-full bg-teal-400 mr-2 animate-pulse"></span>
              Web Analytics • Reimagined
            </motion.div>
            
            <motion.h1 
              className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              Analytics for the <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-500 to-teal-400">Modern Web</span>
            </motion.h1>
            
            <motion.p 
              className="text-lg md:text-xl text-muted-foreground mb-8 md:mb-10 max-w-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              Instant setup. Seamless integration. Beautiful visualization.
              Understand your website's performance at a glance.
            </motion.p>
            
            {/* CTA Buttons */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 mb-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45 }}
            >
              <Link href="/auth">
                <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-8 py-6 h-auto text-base rounded-full shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 transition-all duration-300 hover:-translate-y-1">
                  <Sparkles className="mr-2 h-5 w-5" />
                  Start Free Trial
                </Button>
              </Link>
              <Button variant="outline" className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white px-8 py-6 h-auto text-base rounded-full shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 transition-all duration-300 hover:-translate-y-1">
                See How It Works
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </motion.div>
            
            {/* Feature Highlights */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="grid grid-cols-2 gap-4"
            >
              <div className="flex items-start gap-2">
                <div className="mt-1 p-1.5 rounded-full bg-teal-500/10">
                  <LineChart className="h-4 w-4 text-teal-400" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">Real-time Metrics</h3>
                  <p className="text-xs text-muted-foreground">Live analytics updates</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <div className="mt-1 p-1.5 rounded-full bg-amber-500/10">
                  <Users className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">Visitor Insights</h3>
                  <p className="text-xs text-muted-foreground">Understand your audience</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <div className="mt-1 p-1.5 rounded-full bg-violet-500/10">
                  <Globe className="h-4 w-4 text-violet-400" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">Global Traffic</h3>
                  <p className="text-xs text-muted-foreground">Track visitors worldwide</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <div className="mt-1 p-1.5 rounded-full bg-rose-500/10">
                  <Check className="h-4 w-4 text-rose-400" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">GDPR Compliant</h3>
                  <p className="text-xs text-muted-foreground">Privacy-first approach</p>
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* Right Content Area - Dashboard Preview */}
          <motion.div 
            className="order-1 lg:order-2"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <div className="relative">
              {/* Glow effect behind dashboard */}
              <div className="absolute -z-10 inset-0 bg-gradient-to-tr from-violet-500/20 to-teal-500/20 blur-xl rounded-2xl"></div>
              
              {/* Dashboard image with hover effect */}
              <motion.div 
                className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 backdrop-blur-sm"
                whileHover={{ scale: 1.03, rotate: 0 }}
                initial={{ rotate: 2 }}
                transition={{ duration: 0.5 }}
              >
                <img 
                  src="https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&q=80&w=2800"
                  alt="WebSight Dashboard" 
                  className="w-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60"></div>
                
                {/* Floating stats card */}
                <motion.div
                  className="absolute top-6 right-6 bg-white/10 backdrop-blur-md p-4 rounded-lg border border-white/20"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-500/20 rounded-full">
                      <LineChart className="h-5 w-5 text-teal-400" />
                    </div>
                    <div>
                      <p className="text-xs text-white/70">Today's Traffic</p>
                      <p className="font-semibold text-white">+27.4%</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
            
            {/* Social proof banner */}
            <motion.div 
              className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full backdrop-blur-md border border-white/10 bg-black/30"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <p className="text-sm font-medium text-white/80 flex items-center">
                <span className="flex space-x-1 mr-2">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-amber-400">★</span>
                  ))}
                </span>
                Trusted by 10,000+ websites worldwide
              </p>
            </motion.div>
            
            {/* Browser frame decorative elements */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-3 flex space-x-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-500"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <div className="w-3 h-3 rounded-full bg-teal-500"></div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;