"use client"

import { Card, CardContent } from "@/components/ui/card";
import { LineChart, BarChart, Users, Activity, Bell, Globe, Lock, Zap } from "lucide-react";
import { motion } from "framer-motion";

const featuresData = [
  {
    icon: <LineChart className="h-5 w-5" />,
    title: "Real-time Analytics",
    description: "Track website performance as it happens with live updates and instant insights.",
    color: "from-violet-500 to-indigo-500",
    lightColor: "bg-violet-100 dark:bg-violet-900/30",
    iconColor: "text-violet-600 dark:text-violet-400"
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Visitor Insights",
    description: "Understand your audience with detailed breakdowns of visitor behavior and demographics.",
    color: "from-blue-500 to-cyan-500",
    lightColor: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400"
  },
  {
    icon: <BarChart className="h-5 w-5" />,
    title: "Custom Events",
    description: "Track specific user interactions and conversions that matter most to your business.",
    color: "from-cyan-500 to-teal-500",
    lightColor: "bg-cyan-100 dark:bg-cyan-900/30",
    iconColor: "text-cyan-600 dark:text-cyan-400"
  },
  {
    icon: <Activity className="h-5 w-5" />,
    title: "Performance Monitoring",
    description: "Identify bottlenecks and optimize your website's speed and responsiveness.",
    color: "from-teal-500 to-emerald-500",
    lightColor: "bg-teal-100 dark:bg-teal-900/30",
    iconColor: "text-teal-600 dark:text-teal-400"
  },
  {
    icon: <Bell className="h-5 w-5" />,
    title: "Custom Alerts",
    description: "Set up notifications for important metrics and events that require your attention.",
    color: "from-amber-500 to-orange-500",
    lightColor: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400"
  },
  {
    icon: <Globe className="h-5 w-5" />,
    title: "Geographic Tracking",
    description: "Track visitor locations and understand your global audience distribution.",
    color: "from-orange-500 to-rose-500",
    lightColor: "bg-orange-100 dark:bg-orange-900/30",
    iconColor: "text-orange-600 dark:text-orange-400"
  },
  {
    icon: <Lock className="h-5 w-5" />,
    title: "Privacy Focused",
    description: "Collect data while respecting privacy laws and user consent preferences.",
    color: "from-rose-500 to-pink-500",
    lightColor: "bg-rose-100 dark:bg-rose-900/30",
    iconColor: "text-rose-600 dark:text-rose-400"
  },
  {
    icon: <Zap className="h-5 w-5" />,
    title: "Lightweight Script",
    description: "Minimal impact on your website's loading speed with our optimized tracker.",
    color: "from-pink-500 to-violet-500",
    lightColor: "bg-pink-100 dark:bg-pink-900/30", 
    iconColor: "text-pink-600 dark:text-pink-400"
  }
];

const Features = () => {
  return (
    <section id="features" className="py-24 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-10 right-0 w-80 h-80 bg-teal-300/20 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-10 left-0 w-80 h-80 bg-violet-300/20 rounded-full filter blur-3xl"></div>
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
            Powerful Features
          </motion.p>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
          >
            Everything you need to monitor your website
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-2xl mx-auto text-lg text-muted-foreground"
          >
            WebSight provides a comprehensive suite of tools to help you understand your visitors,
            track performance, and make data-driven decisions.
          </motion.p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuresData.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              <Card className="h-full overflow-hidden group hover:shadow-lg transition-shadow duration-300 border-transparent hover:border-violet-200 dark:hover:border-violet-800">
                <CardContent className="p-6">
                  <div className="mb-4">
                    <div className={`p-3 inline-flex rounded-xl ${feature.lightColor}`}>
                      <div className={`${feature.iconColor}`}>
                        {feature.icon}
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:transition-all group-hover:duration-300 group-hover:ease-in-out">
                    <span className={`group-hover:bg-gradient-to-r group-hover:${feature.color}`}>
                      {feature.title}
                    </span>
                  </h3>
                  
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
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
