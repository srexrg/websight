"use client"

import { useState, useEffect, SetStateAction } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';

const testimonials = [
  {
    id: 1,
    content: "WebSight transformed how we understand our audience. The real-time analytics and visitor insights have been invaluable for our marketing strategy.",
    author: "Sarah Johnson",
    position: "Marketing Director",
    company: "TechFlow Inc.",
    avatar: "https://randomuser.me/api/portraits/women/32.jpg"
  },
  {
    id: 2,
    content: "As a developer, I appreciate how lightweight and easy to implement the tracking script is. It has minimal impact on our site's performance while providing powerful analytics.",
    author: "Alex Chen",
    position: "Lead Developer",
    company: "Byteloom",
    avatar: "https://randomuser.me/api/portraits/men/44.jpg"
  },
  {
    id: 3,
    content: "The custom event tracking has been a game-changer for our e-commerce business. We can now see exactly where customers drop off in our purchase funnel.",
    author: "Michael Rodriguez",
    position: "E-commerce Manager",
    company: "StyleBoost",
    avatar: "https://randomuser.me/api/portraits/men/22.jpg"
  },
  {
    id: 4,
    content: "WebSight's privacy-first approach was the deciding factor for us. We needed analytics that complied with GDPR without compromising on insights.",
    author: "Emma Thompson",
    position: "Data Protection Officer",
    company: "Secure Solutions",
    avatar: "https://randomuser.me/api/portraits/women/65.jpg"
  },
  {
    id: 5,
    content: "The geographic tracking feature has helped us tailor our content strategy to better serve our global audience. The visualizations are beautiful and intuitive.",
    author: "David Kumar",
    position: "Content Strategist",
    company: "GlobalReach Media",
    avatar: "https://randomuser.me/api/portraits/men/68.jpg"
  }
];

const Testimonials = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);

  useEffect(() => {
    let interval: string | number | NodeJS.Timeout | undefined;
    if (autoplay) {
      interval = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % testimonials.length);
      }, 6000);
    }
    return () => clearInterval(interval);
  }, [autoplay]);

  const handlePrev = () => {
    setAutoplay(false);
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const handleNext = () => {
    setAutoplay(false);
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  };

  const handleDotClick = (index: SetStateAction<number>) => {
    setAutoplay(false);
    setActiveIndex(index);
  };

  return (
    <section 
      id="customers" 
      className="relative py-32 bg-gradient-to-b from-black to-zinc-900 overflow-hidden"
      aria-label="Testimonials Section"
    >
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_200px,#7c3aed10,transparent)]" />
        <motion.div 
          className="absolute top-1/4 right-10 w-80 h-80 bg-gradient-to-br from-violet-500/5 to-indigo-500/5 rounded-full filter blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-1/3 left-10 w-72 h-72 bg-gradient-to-br from-indigo-500/5 to-violet-500/5 rounded-full filter blur-3xl"
          animate={{ scale: [1.2, 1, 1.2] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      
      <div className="container relative mx-auto px-4 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-3xl mx-auto mb-24"
        >
          <h2 className="text-4xl md:text-6xl font-heading mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-violet-200 to-violet-500">
            Trusted by businesses worldwide
            <span className="block mt-3 text-gray-300 text-2xl md:text-3xl font-title">
              See what our customers say
            </span>
          </h2>
          <p className="text-gray-400 text-lg md:text-xl font-light tracking-wide max-w-2xl mx-auto">
            Join thousands of businesses using WebSight to transform their analytics experience
          </p>
        </motion.div>
        
        <div className="max-w-5xl mx-auto relative">
          {/* Decorative quotes */}
          <div className="absolute -top-10 -left-10 text-violet-500/10">
            <Quote size={80} />
          </div>
          <div className="absolute -bottom-10 -right-10 text-violet-500/10 rotate-180">
            <Quote size={80} />
          </div>
          
          {/* Testimonial carousel */}
          <div className="relative">
            <div className="overflow-hidden py-10">
              <div className="relative flex flex-col items-center min-h-[400px]">
                {testimonials.map((testimonial, index) => (
                  <motion.div
                    key={testimonial.id}
                    className={`absolute inset-0 transition-all duration-500 ease-in-out flex flex-col items-center justify-center ${
                      index === activeIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
                    }`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ 
                      opacity: index === activeIndex ? 1 : 0,
                      scale: index === activeIndex ? 1 : 0.9,
                      x: index === activeIndex ? 0 : (index < activeIndex ? '-100%' : '100%')
                    }}
                    transition={{ duration: 0.6, ease: 'easeInOut' }}
                  >
                    <div className="max-w-3xl mx-auto text-center px-6">
                      <div className="bg-zinc-900/40 backdrop-blur-xl p-8 rounded-2xl border border-violet-500/10 shadow-lg shadow-violet-500/5">
                        <p className="text-xl md:text-2xl text-gray-300 italic mb-8 leading-relaxed">
                          "{testimonial.content}"
                        </p>
                        
                        <div className="flex flex-col items-center">
                          <div className="mb-4 relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full blur"></div>
                            <img 
                              src={testimonial.avatar} 
                              alt={testimonial.author}
                              className="w-16 h-16 rounded-full object-cover relative z-10 border-2 border-zinc-900"
                            />
                          </div>
                          <h4 className="font-semibold text-lg text-white">{testimonial.author}</h4>
                          <p className="text-gray-400">{testimonial.position}, {testimonial.company}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            
            {/* Navigation controls */}
            <div className="flex justify-center items-center mt-10 gap-2">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full border-violet-500/20 bg-zinc-900/40 hover:bg-zinc-900/60 backdrop-blur-xl"
                onClick={handlePrev}
              >
                <ChevronLeft className="h-5 w-5 text-violet-400" />
              </Button>
              
              <div className="flex space-x-2 mx-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${
                      index === activeIndex 
                        ? 'bg-gradient-to-r from-violet-500 to-indigo-500 w-6' 
                        : 'bg-violet-500/20'
                    }`}
                    onClick={() => handleDotClick(index)}
                  />
                ))}
              </div>
              
              <Button
                variant="outline"
                size="icon"
                className="rounded-full border-violet-500/20 bg-zinc-900/40 hover:bg-zinc-900/60 backdrop-blur-xl"
                onClick={handleNext}
              >
                <ChevronRight className="h-5 w-5 text-violet-400" />
              </Button>
            </div>
          </div>
          
          {/* Company logos */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-20 pt-10"
          >
            <p className="text-center text-sm text-gray-400 mb-8">Trusted by innovative companies worldwide</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 items-center justify-items-center">
              {['TechFlow', 'Byteloom', 'StyleBoost', 'SecureSolutions', 'GlobalReach'].map((company, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="group flex items-center justify-center h-8 relative"
                >
                  <div className="text-lg font-semibold tracking-tight bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent opacity-70 group-hover:opacity-100 transition-opacity duration-300">
                    {company}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
