'use client';

import { motion } from 'framer-motion';

const Cta = () => {
  return (
    <section className="relative py-20 bg-black overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_200px,#2563eb10,transparent)]" />
      
      <div className="container relative mx-auto px-4 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="text-center"
        >
          <div className="bg-gradient-to-r from-blue-600/20 to-blue-600/20 border border-blue-500/20 rounded-xl p-8 max-w-3xl mx-auto">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 font-oswald">
              Ready to transform your analytics experience?
            </h3>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto font-jakarta">
              Join thousands of websites that have switched to a simpler, more
              powerful analytics solution.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/auth"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-300 font-oswald"
              >
                Get Started Free
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default Cta;

