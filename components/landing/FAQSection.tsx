"use client";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQSection = () => {
  const faqs = [
    {
      question: "Is your analytics platform free to use?",
      answer:
        "Yes! Our platform is completely free with no hidden costs or paid plans. You get access to all features including custom event tracking, real-time analytics, and advanced metrics without any limitations.",
    },
    {
      question: "How does your platform compare to Vercel Analytics?",
      answer:
        "Unlike Vercel Analytics which requires paid plans for features like custom events and advanced metrics, our platform offers all features completely free. We provide comprehensive analytics including custom event tracking, real-time insights, and detailed user behavior analysis at no cost.",
    },
    {
      question: "How easy is it to set up the analytics platform?",
      answer:
        "Setup is incredibly simple - just add our lightweight tracking script to your website. We provide step-by-step guides, code snippets, and integration support for all major frameworks including Next.js, React, and more. Most users can get started in under 5 minutes.",
    },
    {
      question: "What operating systems and platforms do you support?",
      answer:
        "Our platform is platform-agnostic and works with any operating system. Whether you're using Windows, macOS, Linux, or deploying to any cloud provider, our analytics solution will work seamlessly.",
    },
  ];

  return (
    <section id="FAQ" className="relative py-26 bg-black">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800/10 via-black to-black" />

      <div className="container relative z-10 mx-auto px-4 mb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <Badge className="mb-4 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors border-0">
            <Sparkles className="mr-1 h-3 w-3" />
            FAQ
          </Badge>
          <h2 className="text-4xl md:text-5xl font-oswald mb-6">
            Got
            <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text font-oswald text-transparent px-3">
              Questions
            </span>
            ?
          </h2>
          <p className="text-gray-400 text-lg font-jakarta">
            Find answers to common questions about our analytics platform
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <AccordionItem
                  value={`item-${index}`}
                  className="border border-blue-500/20 rounded-lg overflow-hidden bg-gradient-to-br from-zinc-900 to-black px-6"
                >
                  <AccordionTrigger className="hover:no-underline py-6 text-left cursor-pointer">
                    <div className="flex items-center gap-2">
                      {/* <Plus className="h-4 w-4 text-blue-400 shrink-0" /> */}
                      <span className="text-lg font-medium text-gray-200 group-hover:text-white transition-colors font-jakarta">
                        {faq.question}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-400 text-lg pb-8 font-jakarta">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
