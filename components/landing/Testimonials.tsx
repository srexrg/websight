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
    <section id="customers" className="py-24 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-950/20 dark:to-indigo-950/20"></div>
        <motion.div 
          className="absolute top-1/4 right-10 w-80 h-80 rounded-full bg-pink-300/10 filter blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-1/3 left-10 w-72 h-72 rounded-full bg-violet-300/10 filter blur-3xl"
          animate={{ scale: [1.2, 1, 1.2] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-sm uppercase font-semibold tracking-wider text-violet-600 dark:text-violet-400 mb-3"
          >
            Testimonials
          </motion.p>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
          >
            Trusted by businesses worldwide
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-2xl mx-auto text-lg text-muted-foreground"
          >
            See what our customers have to say about their experience with WebSight analytics.
          </motion.p>
        </div>
        
        <div className="max-w-5xl mx-auto relative">
          {/* Decorative elements */}
          <div className="absolute -top-10 -left-10 text-violet-200 dark:text-violet-800 opacity-30">
            <Quote size={80} />
          </div>
          <div className="absolute -bottom-10 -right-10 text-violet-200 dark:text-violet-800 opacity-30 rotate-180">
            <Quote size={80} />
          </div>
          
          {/* Testimonial carousel */}
          <div className="relative">
            <div className="overflow-hidden py-10">
              <div className="relative flex flex-col items-center">
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
                      <p className="text-xl md:text-2xl italic mb-8 leading-relaxed">
                        "{testimonial.content}"
                      </p>
                      
                      <div className="flex flex-col items-center">
                        <div className="mb-4 relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full blur-sm"></div>
                          <img 
                            src={testimonial.avatar} 
                            alt={testimonial.author}
                            className="w-16 h-16 rounded-full object-cover relative z-10 border-2 border-white dark:border-gray-800"
                          />
                        </div>
                        <h4 className="font-semibold text-lg">{testimonial.author}</h4>
                        <p className="text-muted-foreground">{testimonial.position}, {testimonial.company}</p>
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
                className="rounded-full border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-900/30"
                onClick={handlePrev}
              >
                <ChevronLeft className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </Button>
              
              <div className="flex space-x-2 mx-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      index === activeIndex 
                        ? 'bg-gradient-to-r from-violet-500 to-indigo-500 w-6' 
                        : 'bg-violet-200 dark:bg-violet-800'
                    }`}
                    onClick={() => handleDotClick(index)}
                  />
                ))}
              </div>
              
              <Button
                variant="outline"
                size="icon"
                className="rounded-full border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-900/30"
                onClick={handleNext}
              >
                <ChevronRight className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </Button>
            </div>
          </div>
          
          {/* Company logos */}
          <div className="mt-20 border-t border-violet-100 dark:border-violet-900 pt-10">
            <p className="text-center text-sm text-muted-foreground mb-8">Trusted by innovative companies around the world</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 items-center justify-items-center">
              {['TechFlow', 'Byteloom', 'StyleBoost', 'SecureSolutions', 'GlobalReach'].map((company, i) => (
                <div key={i} className="flex items-center justify-center h-8">
                  <div className="text-lg font-semibold tracking-tight opacity-70 bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent">
                    {company}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
