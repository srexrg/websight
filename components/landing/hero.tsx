"use client"

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";

const buttonVariants = {
  initial: { scale: 1 },
  hover: {
    scale: 1.05,
    transition: { duration: 0.2 },
  },
  tap: {
    scale: 0.95,
    transition: { duration: 0.1 },
  },
};


const Hero = () => {
  return (
    <section className="pt-24 pb-20 md:pt-32 md:pb-32 relative overflow-hidden bg-black">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_200px,#2563eb15,transparent)]" />
        <motion.div
          className="absolute top-1/4 left-20 w-64 h-64 bg-gradient-to-br from-blue-600/10 to-blue-700/10 rounded-full filter blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/3 right-20 w-72 h-72 bg-gradient-to-br from-blue-700/10 to-blue-600/10 rounded-full filter blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.6, 0.3, 0.6] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <motion.h1
            className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-white font-oswald"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            The modern analytics platform
            <br />
            for effortless insights.
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-gray-300 mb-8 md:mb-10 font-jakarta"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            WebSight makes it easy to collect, analyze, and understand your
            website data — so you can focus on{" "}
            <span className="text-blue-400">growth</span>
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={buttonVariants}
            initial="initial"
            whileHover="hover"
            whileTap="tap"
            className="flex justify-center"
          >
            <Link href="/auth">
              <Button 
                size="lg"
                className="bg-blue-600 text-white font-bold cursor-pointer shadow-lg hover:shadow-xl hover:bg-blue-600/80 px-10 py-7 rounded-lg min-w-[240px]"
              >
                <span className="text-xl font-jakarta tracking-wide text-gray-100">
                  Get Started
                </span>
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;