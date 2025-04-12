"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button"; 
import Link from "next/link"; 


const Cta = () => {
  return (
    <section className="relative py-20 md:py-24 bg-black text-white overflow-hidden">
      {/* Enhanced Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-zinc-950/50 to-black"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[150%] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.15),transparent_70%)] opacity-70"></div>
      </div>
      <div className="container relative mx-auto px-4 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }} // Added scale
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }} // Trigger earlier
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }} // Adjusted timing
          className="text-center"
        >
          {/* Improved card styling */}
          <div className="bg-gradient-to-br from-zinc-900/70 to-zinc-950/80 border border-blue-800/40 rounded-xl p-8 md:p-12 max-w-3xl mx-auto shadow-xl shadow-blue-950/20 backdrop-blur-sm">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-oswald">
              Ready to Transform Your Analytics?
            </h2>
            <p className="text-gray-300 mb-8 max-w-2xl mx-auto text-lg font-jakarta">
              Get started in minutes with our privacy-focused, powerful
              analytics solution. It's free, forever.
            </p>
            <div className="flex justify-center">
              {/* Use Button component */}
              <Link href="/auth" passHref>
                <Button
                  asChild
                  size="lg" 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg hover:shadow-blue-500/50 focus-visible:ring-blue-400 px-8 py-3 rounded-lg text-lg font-jakarta tracking-wide transition-all duration-300 transform hover:scale-105"
                >
                  Get Started Free
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Cta;
