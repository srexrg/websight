"use client"

import {
  LineChart,
  BarChart,
  Users,
  Activity,
  Bell,
  Globe,
  Lock,
  Zap
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
      className="relative py-32 bg-gradient-to-b from-black to-zinc-900 overflow-hidden"
      aria-label="Features Section"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_200px,#7c3aed10,transparent)]" />

      <div className="container relative mx-auto px-4 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center max-w-3xl mx-auto mb-24"
        >
          <h2 className="text-4xl md:text-6xl font-heading mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-violet-200 to-violet-500">
            Website Analytics Reimagined
            <span className="block mt-3 text-gray-300 text-2xl md:text-3xl font-title">
              Powerful Insights Made Simple
            </span>
          </h2>
          <p className="text-gray-400 text-lg md:text-xl font-light tracking-wide max-w-2xl mx-auto">
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
                delay: index * 0.15,
                ease: "easeOut"
              }}
            >
              <Card className="group h-full bg-zinc-900/40 hover:bg-zinc-900/60 transition-all duration-500 backdrop-blur-xl border-0">
                <CardContent className="p-8 flex flex-col gap-8">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/30 flex items-center justify-center shadow-lg shadow-black/40">
                    <div className="text-violet-400 group-hover:scale-110 group-hover:text-violet-300 transition-all duration-500">
                      {feature.icon}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-xl font-medium text-white tracking-tight group-hover:text-violet-300 transition-colors duration-500">
                      {feature.title}
                    </h3>
                    <p className="text-gray-400 leading-relaxed text-sm">
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
