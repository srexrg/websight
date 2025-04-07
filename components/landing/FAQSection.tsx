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
      question: "What types of photos work best with the AI ?",
      answer:
        "Our AI works best with clear, well-lit photos of faces. We recommend uploading 10-15 diverse photos including selfies, professional shots, and casual photos from different angles - including full body shots, close-up face shots, profile views, and 3/4 angles.",
    },
    {
      question: "How long does it take to process photos ?",
      answer:
        "It takes around 20-30 minutes to train the AI Models and it will only take less than 15 seconds to generate the AI Photos.",
    },
    {
      question: "Can I use the generated images commercially ?",
      answer:
        "Yes, with our Pro and Premium plans, you receive full commercial usage rights for all AI-generated images",
    },
    {
      question: "What happens to my original photos ?",
      answer:
        "Your privacy is our priority. The original photos are processed securely and automatically deleted after processing. We never share or use your photos for any other purpose.",
    },
    {
      question: "What types of models are available ?",
      answer:
        "We give you Free access to multiple models like Flux Models and NVIDIA Sana.",
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
          <h2 className="text-4xl md:text-5xl font-title mb-6">
            Got
            <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent px-3">
              Questions
            </span>
            ?
          </h2>
          <p className="text-gray-400 text-lg font-text">
            Find answers to common questions about our AI photo transformation
            service
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
                      <span className="text-lg font-medium text-gray-200 group-hover:text-white transition-colors font-title">
                        {faq.question}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-400 text-lg pb-8 font-text">
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
