"use client"

import {
  LineChart,
  BarChart,
  Users,
  Activity,
  Bell,
  Globe,
} from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

const featuresData = [
  {
    title: "Real-time Analytics",
    description: "Track website performance as it happens with live updates and instant insights.",
    icon: <LineChart className="w-6 h-6" />,
  },
  {
    title: "Visitor Insights",
    description: "Understand your audience with detailed breakdowns of visitor behavior and demographics.",
    icon: <Users className="w-6 h-6" />,
  },
  {
    title: "Custom Events",
    description: "Track specific user interactions and conversions that matter most to your business.",
    icon: <BarChart className="w-6 h-6" />,
  },
  {
    title: "Performance Monitoring",
    description: "Identify bottlenecks and optimize your website's speed and responsiveness.",
    icon: <Activity className="w-6 h-6" />,
  },
  {
    title: "Smart Alerts",
    description: "Get instant notifications for important metrics and events that require attention.",
    icon: <Bell className="w-6 h-6" />,
  },
  {
    title: "Global Tracking",
    description: "Monitor visitor locations and understand your worldwide audience distribution.",
    icon: <Globe className="w-6 h-6" />,
  }
];

const Features = () => {
  return (
    <section
      id="features"
      className="relative py-32 bg-black overflow-hidden"
      aria-label="Features Section"
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
            Website Analytics Reimagined
            <span className="block mt-3 text-gray-400 text-xl md:text-2xl font-normal">
              Powerful Insights Made Simple
            </span>
          </h2>
          <p className="text-gray-400 text-lg md:text-xl font-light max-w-2xl mx-auto">
            Transform your website data into actionable insights with our comprehensive analytics suite
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-6 lg:gap-8">
          {featuresData.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: index * 0.1,
                ease: "easeOut"
              }}
            >
              <Card className="group h-full bg-zinc-900/40 hover:bg-zinc-900/60 transition-all duration-500 backdrop-blur-xl border border-zinc-800 rounded-lg overflow-hidden cursor-pointer">
                <CardContent className="p-8">
                  <div className="mb-6">
                    <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <div className="text-blue-400 group-hover:scale-110 group-hover:text-blue-300 transition-all duration-500">
                        {feature.icon}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-white mb-3 group-hover:text-blue-300 transition-colors duration-500">
                      {feature.title}
                    </h3>
                    <p className="text-gray-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
