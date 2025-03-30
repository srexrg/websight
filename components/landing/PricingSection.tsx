"use client"

import { motion } from 'framer-motion';
import { ArrowRight, Check, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const PricingSection = () => {
  const plans = [
    {
      name: "Starter",
      description: "Perfect for personal websites and small projects",
      price: "$9",
      billing: "/month",
      features: [
        "Up to 10,000 monthly pageviews",
        "Real-time analytics",
        "Custom events tracking (3 events)",
        "Basic visitor insights",
        "Email reports",
        "7-day data retention"
      ],
      highlighted: false,
      cta: "Start Free Trial",
      delay: 0.1
    },
    {
      name: "Pro",
      description: "For growing businesses with multiple websites",
      price: "$29",
      billing: "/month",
      features: [
        "Up to 100,000 monthly pageviews",
        "Real-time analytics",
        "Custom events tracking (10 events)",
        "Advanced visitor insights",
        "Email & Slack reports",
        "30-day data retention",
        "Multiple websites support",
        "API access"
      ],
      highlighted: true,
      cta: "Start Free Trial",
      delay: 0.2
    },
    {
      name: "Business",
      description: "For established businesses with high traffic",
      price: "$79",
      billing: "/month",
      features: [
        "Up to 500,000 monthly pageviews",
        "Real-time analytics",
        "Unlimited custom events",
        "Advanced visitor insights",
        "Customizable reports",
        "90-day data retention",
        "Multiple websites support",
        "Priority API access",
        "Dedicated support"
      ],
      highlighted: false,
      cta: "Start Free Trial",
      delay: 0.3
    }
  ];

  return (
    <section id="pricing" className="py-24 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-t from-blue-950/10 via-transparent to-transparent"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full filter blur-3xl"></div>
        <div className="absolute top-1/3 right-0 w-64 h-64 bg-blue-500/10 rounded-full filter blur-3xl"></div>
      </div>
      
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-sm uppercase font-semibold tracking-wider text-purple-400 mb-3"
          >
            Pricing Plans
          </motion.p>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
          >
            Choose the perfect plan for your needs
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-2xl mx-auto text-lg text-gray-400"
          >
            All plans include a 14-day free trial. No credit card required.
          </motion.p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: plan.delay }}
              className={`relative rounded-2xl overflow-hidden h-full ${
                plan.highlighted 
                  ? 'border-2 border-purple-500' 
                  : 'border border-gray-800'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-center text-xs font-medium py-1.5">
                  MOST POPULAR
                </div>
              )}
              
              <div className={`p-8 bg-gray-900 h-full flex flex-col ${plan.highlighted ? 'pt-12' : ''}`}>
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-gray-400 text-sm mb-4">{plan.description}</p>
                  <div className="flex items-baseline mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-gray-400 ml-1">{plan.billing}</span>
                  </div>
                </div>
                
                <div className="space-y-4 mb-8 flex-grow">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        <Check className="h-5 w-5 text-purple-500" />
                      </div>
                      <p className="ml-3 text-gray-300 text-sm">{feature}</p>
                    </div>
                  ))}
                </div>
                
                <div className="mt-auto">
                  <Link href="/auth">
                    <Button 
                      className={`w-full ${
                        plan.highlighted 
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white' 
                          : 'bg-gray-800 hover:bg-gray-700 text-white'
                      } p-6 h-auto rounded-xl font-medium`}
                    >
                      {plan.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Enterprise section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-16 bg-gray-900 border border-gray-800 rounded-2xl p-8 md:p-10"
        >
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-3">Enterprise</h3>
              <p className="text-gray-400 mb-6">
                Custom solutions for large organizations with high-volume websites and specialized needs.
              </p>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <Check className="h-5 w-5 text-purple-500" />
                  </div>
                  <p className="ml-3 text-gray-300 text-sm">Unlimited pageviews</p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <Check className="h-5 w-5 text-purple-500" />
                  </div>
                  <p className="ml-3 text-gray-300 text-sm">Custom data retention policies</p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <Check className="h-5 w-5 text-purple-500" />
                  </div>
                  <p className="ml-3 text-gray-300 text-sm">Dedicated account manager</p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <Check className="h-5 w-5 text-purple-500" />
                  </div>
                  <p className="ml-3 text-gray-300 text-sm">Custom integrations</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center md:items-end space-y-4">
              <Button 
                className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-6 h-auto rounded-xl font-medium"
              >
                Contact Sales
              </Button>
              <p className="text-sm text-gray-400">Let's discuss your requirements</p>
            </div>
          </div>
        </motion.div>
        
        {/* FAQ section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-20 text-center"
        >
          <h3 className="text-xl font-semibold mb-2 flex items-center justify-center gap-2">
            <HelpCircle className="h-5 w-5 text-purple-400" />
            Have questions?
          </h3>
          <p className="text-gray-400 mb-4">
            Check out our <Link href="/faq" className="text-purple-400 hover:text-purple-300 underline">FAQ</Link> or <Link href="/contact" className="text-purple-400 hover:text-purple-300 underline">contact our team</Link>.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;