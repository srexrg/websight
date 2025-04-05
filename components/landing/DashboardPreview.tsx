"use client"

import { motion } from 'framer-motion';
import {  ArrowUp, Users, Globe, MousePointer, Clock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const DashboardPreview = () => {
  // Mock data for charts and metrics
  const visitorData = [30, 42, 35, 60, 75, 50, 65, 80, 65, 90, 110, 100, 120];
  const conversionData = [5, 10, 8, 15, 20, 18, 25, 30, 25, 35, 40, 38, 45];
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };
  
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 },
  };

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-blue-950/10 to-gray-950"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] bg-repeat opacity-5"></div>
        <motion.div 
          className="absolute top-1/3 left-1/4 w-80 h-80 rounded-full bg-blue-600/10 filter blur-3xl"
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.2, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-purple-600/10 filter blur-3xl"
          animate={{ 
            scale: [1.1, 1, 1.1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
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
            Powerful Dashboard
          </motion.p>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold tracking-tight mb-4"
          >
            Get a complete view of your website performance
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-2xl mx-auto text-lg text-gray-400"
          >
            Beautiful, intuitive analytics that help you understand your audience and make data-driven decisions.
          </motion.p>
        </div>
        
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={containerVariants}
          className="relative max-w-6xl mx-auto"
        >
          {/* Dashboard mockup */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gray-800 p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <span className="text-sm text-gray-400 ml-2">WebSight Analytics Dashboard</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="h-6 w-24 bg-gray-700 rounded-md"></div>
                <div className="h-6 w-6 bg-gray-700 rounded-full"></div>
              </div>
            </div>
            
            {/* Dashboard content */}
            <div className="p-6">
              {/* Overview header */}
              <motion.div 
                variants={itemVariants}
                className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8"
              >
                <div>
                  <h3 className="text-xl font-semibold">Dashboard Overview</h3>
                  <p className="text-gray-400 text-sm">Last 14 days performance</p>
                </div>
                <div className="flex items-center space-x-3 mt-4 md:mt-0">
                  <div className="h-8 w-24 bg-gray-800 rounded-md"></div>
                  <div className="h-8 w-20 bg-gray-800 rounded-md"></div>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-md">
                    Export
                  </Button>
                </div>
              </motion.div>
              
              {/* Stats overview */}
              <motion.div 
                variants={itemVariants}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
              >
                {[
                  { label: "Total Visitors", value: "2,451", icon: <Users className="h-5 w-5" />, change: "+12.5%", color: "text-blue-500 bg-blue-500/10" },
                  { label: "Page Views", value: "4,872", icon: <Globe className="h-5 w-5" />, change: "+8.2%", color: "text-blue-500 bg-blue-500/10" },
                  { label: "Avg. Time on Site", value: "3:42", icon: <Clock className="h-5 w-5" />, change: "+2.1%", color: "text-blue-500 bg-blue-500/10" },
                  { label: "Conversion Rate", value: "3.8%", icon: <MousePointer className="h-5 w-5" />, change: "+5.3%", color: "text-blue-500 bg-blue-500/10" }
                ].map((stat, i) => (
                  <div key={i} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                    <div className="flex justify-between items-start mb-3">
                      <div className={`p-2 rounded-lg ${stat.color}`}>
                        {stat.icon}
                      </div>
                      <div className="flex items-center text-green-400 text-xs font-medium">
                        <ArrowUp className="h-3 w-3 mr-1" />
                        {stat.change}
                      </div>
                    </div>
                    <h4 className="text-sm text-gray-400 mb-1">{stat.label}</h4>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                ))}
              </motion.div>
              
              {/* Main chart */}
              <motion.div variants={itemVariants} className="mb-8">
                <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h4 className="font-medium">Website Traffic</h4>
                      <p className="text-sm text-gray-400">Daily visitors and page views</p>
                    </div>
                    <div className="flex space-x-2">
                      <div className="h-7 w-16 bg-gray-700 rounded-md"></div>
                      <div className="h-7 w-16 bg-gray-700 rounded-md"></div>
                      <div className="h-7 w-16 bg-gray-700 rounded-md"></div>
                    </div>
                  </div>
                  
                  {/* Chart visualization */}
                  <div className="h-64 w-full">
                    <div className="relative h-full w-full">
                      {/* X-axis */}
                      <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-700"></div>
                      
                      {/* Y-axis */}
                      <div className="absolute top-0 bottom-0 left-0 w-px bg-gray-700"></div>
                      
                      {/* Chart bars for visitors */}
                      <div className="absolute bottom-0 left-0 right-0 h-full flex items-end justify-between px-4">
                        {visitorData.map((value, i) => (
                          <motion.div
                            key={i}
                            className="h-full flex items-end"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ 
                              opacity: 1, 
                              height: `${(value / 120) * 100}%` 
                            }}
                            transition={{ 
                              duration: 1,
                              delay: 0.5 + (i * 0.05),
                              ease: "easeOut" 
                            }}
                          >
                            <div className="w-4 bg-blue-500 rounded-t-sm mx-0.5" style={{ height: `${(value / 120) * 100}%` }}></div>
                          </motion.div>
                        ))}
                      </div>
                      
                      {/* Chart line for conversions */}
                      <div className="absolute bottom-0 left-0 right-0 h-full px-4">
                        <svg className="w-full h-full" viewBox={`0 0 ${visitorData.length * 20} 100`} preserveAspectRatio="none">
                          <motion.path
                            d={`M ${conversionData.map((value, i) => `${i * 20 + 10},${100 - (value / 45) * 100}`).join(' L ')}`}
                            stroke="#38bdf8"
                            strokeWidth="2"
                            fill="none"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 2, delay: 1 }}
                          />
                          {conversionData.map((value, i) => (
                            <motion.circle
                              key={i}
                              cx={i * 20 + 10}
                              cy={100 - (value / 45) * 100}
                              r="3"
                              fill="#38bdf8"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.5, delay: 1.5 + (i * 0.05) }}
                            />
                          ))}
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  {/* Chart legend */}
                  <div className="flex items-center justify-center space-x-6 mt-4">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-sm mr-2"></div>
                      <span className="text-sm text-gray-400">Visitors</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-400 rounded-sm mr-2"></div>
                      <span className="text-sm text-gray-400">Conversions</span>
                    </div>
                  </div>
                </div>
              </motion.div>
              
              {/* Bottom panels */}
              <motion.div 
                variants={itemVariants}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {/* Pages table */}
                <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                  <h4 className="font-medium mb-4">Top Pages</h4>
                  <div className="space-y-3">
                    {[
                      { page: "/homepage", views: "1,245", time: "2:12" },
                      { page: "/features", views: "852", time: "1:42" },
                      { page: "/pricing", views: "643", time: "3:10" },
                      { page: "/blog/analytics", views: "429", time: "4:35" },
                      { page: "/about", views: "318", time: "1:15" }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                        <span className="text-sm text-gray-300">{item.page}</span>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-400">{item.views}</span>
                          <span className="text-sm text-gray-400">{item.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link href="/demo">
                    <Button variant="ghost" className="mt-4 text-purple-400 hover:text-purple-300 p-0 h-auto">
                      View all pages
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
                
                {/* Countries panel */}
                <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                  <h4 className="font-medium mb-4">Top Countries</h4>
                  <div className="space-y-3">
                    {[
                      { country: "United States", percentage: 35, visits: "858" },
                      { country: "United Kingdom", percentage: 25, visits: "612" },
                      { country: "Germany", percentage: 15, visits: "367" },
                      { country: "Canada", percentage: 10, visits: "245" },
                      { country: "Australia", percentage: 8, visits: "196" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-300">{item.country}</span>
                        <div className="flex items-center space-x-4">
                          <div className="w-24 bg-gray-700 rounded-full h-2 overflow-hidden">
                            <motion.div 
                              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                              initial={{ width: 0 }}
                              whileInView={{ width: `${item.percentage}%` }}
                              viewport={{ once: true }}
                              transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                            ></motion.div>
                          </div>
                          <span className="text-sm text-gray-400">{item.visits}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link href="/demo">
                    <Button variant="ghost" className="mt-4 text-purple-400 hover:text-purple-300 p-0 h-auto">
                      View all locations
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
          
          {/* CTA banner */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-16 text-center"
          >
            <h3 className="text-xl font-semibold mb-4">Ready to get started?</h3>
            <p className="text-gray-400 mb-6 max-w-xl mx-auto">
              Start tracking your website analytics today and get valuable insights about your visitors.
            </p>
            <Link href="/auth">
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-2.5 rounded-full">
                Start Free Trial
                <ArrowUp className="ml-2 h-4 w-4 rotate-45" />
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default DashboardPreview;