"use client"

import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

const ComparisonSection = () => {
  const comparison = {
    traditional: {
      title: "Traditional Analytics",
      points: [
        "Complex dashboards with steep learning curves",
        "Data export features locked behind premium paywalls",
        "Requires technical expertise to implement",
        "Data silos across different platforms",
      ]
    },
    websight: {
      title: "WebSight",
      points: [
        "Intuitive interface designed for all skill levels",
        "Free data export with no hidden paywalls",
        "Simple one-line code snippet for implementation",
        "Unified analytics across all your properties",
      ]
    }
  };

  return (
    <section 
      id="comparison" 
      className="relative py-32 bg-black overflow-hidden"
      aria-label="Comparison Section"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_200px,#2563eb10,transparent)]" />

      <div className="container relative mx-auto px-4 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-3xl mx-auto mb-24"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            Why choose WebSight for your analytics?
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Traditional Analytics */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-red-50/5 border border-red-200/10 rounded-2xl p-8"
          >
            <h3 className="text-xl font-semibold text-red-400 mb-6">
              {comparison.traditional.title}
            </h3>
            <div className="space-y-4">
              {comparison.traditional.points.map((point, index) => (
                <div key={index} className="flex items-start gap-3">
                  <X className="h-5 w-5 text-red-400 mt-1 flex-shrink-0" />
                  <p className="text-gray-300">{point}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* WebSight */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-blue-50/5 border border-blue-200/10 rounded-2xl p-8"
          >
            <h3 className="text-xl font-semibold text-blue-400 mb-6">
              {comparison.websight.title}
            </h3>
            <div className="space-y-4">
              {comparison.websight.points.map((point, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-blue-400 mt-1 flex-shrink-0" />
                  <p className="text-gray-300">{point}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ComparisonSection; 