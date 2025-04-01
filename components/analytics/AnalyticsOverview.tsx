'use client'

import { Card } from "@/components/ui/card";
import { WorldMap } from "./WorldMap";
import { motion } from "framer-motion";
import { Users, Globe2, Monitor, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

interface DeviceStats {
  deviceType: string;
  visits: number;
}

interface CountryStats {
  country: string;
  visits: number;
}

interface OsStats {
  os: string;
  visits: number;
}

interface DailyStat {
  date: string;
  visits: number;
  unique_visitors: number;
  page_views: number;
}

interface AnalyticsOverviewProps {
  pageViews: number;
  totalVisits: number;
  uniqueVisitors: number;
  deviceStats?: DeviceStats[];
  countryStats?: CountryStats[];
  osStats?: OsStats[];
  dailyStats?: DailyStat[];
}

export function AnalyticsOverview({ 
  pageViews, 
  totalVisits, 
  uniqueVisitors,
  deviceStats = [],
  countryStats = [],
  osStats = [],
  dailyStats = []
}: AnalyticsOverviewProps) {
  const abbreviateNumber = (number: number): string => {
    if (number >= 1000000) {
      return (number / 1000000).toFixed(1) + "M";
    } else if (number >= 1000) {
      return (number / 1000).toFixed(1) + "K";
    } else {
      return number.toString();
    }
  };

  const calculatePercentage = (value: number, total: number): string => {
    return total > 0 ? ((value / total) * 100).toFixed(1) + "%" : "0%";
  };

  const calculateGrowth = (current: number, previous: number): number => {
    return previous > 0 ? ((current - previous) / previous) * 100 : 0;
  };

  // Process daily stats for charts
  const chartData = dailyStats.map(stat => ({
    name: new Date(stat.date).toISOString().split('T')[0].slice(5), 
    "Page Views": stat.page_views,
    "Unique Visitors": stat.unique_visitors,
    "Total Visits": stat.visits
  }));

  // Calculate growth rates
  const midPoint = Math.floor(dailyStats.length / 2);
  const recentTotal = dailyStats.slice(midPoint).reduce((acc, curr) => acc + curr.visits, 0);
  const previousTotal = dailyStats.slice(0, midPoint).reduce((acc, curr) => acc + curr.visits, 0);
  const growthRate = calculateGrowth(recentTotal, previousTotal);

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-zinc-900/40 border-zinc-800 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-violet-600/10">
              <Users className="h-5 w-5 text-violet-500" />
            </div>
            <div className="flex items-center gap-1 text-sm">
              <span className={`flex items-center ${growthRate >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {growthRate >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                {Math.abs(growthRate).toFixed(1)}%
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-400 mb-1">Total Visits</p>
          <p className="text-2xl font-bold text-white">{abbreviateNumber(totalVisits)}</p>
        </Card>

        <Card className="p-6 bg-zinc-900/40 border-zinc-800 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-blue-600/10">
              <Globe2 className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          <p className="text-sm text-gray-400 mb-1">Page Views</p>
          <p className="text-2xl font-bold text-white">{abbreviateNumber(pageViews)}</p>
        </Card>

        <Card className="p-6 bg-zinc-900/40 border-zinc-800 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-emerald-600/10">
              <Users className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
          <p className="text-sm text-gray-400 mb-1">Unique Visitors</p>
          <p className="text-2xl font-bold text-white">{abbreviateNumber(uniqueVisitors)}</p>
        </Card>

        <Card className="p-6 bg-zinc-900/40 border-zinc-800 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 rounded-lg bg-amber-600/10">
              <Monitor className="h-5 w-5 text-amber-500" />
            </div>
          </div>
          <p className="text-sm text-gray-400 mb-1">Avg. Session Duration</p>
          <p className="text-2xl font-bold text-white">3m 12s</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-zinc-900/40 border-zinc-800 backdrop-blur-xl">
          <h3 className="text-lg font-semibold text-white mb-4">Traffic Overview</h3>
          <div className="h-[300px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="name" 
                  stroke="#525252" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#525252"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => abbreviateNumber(value)}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2 shadow-md">
                          <div className="grid grid-cols-2 gap-2">
                            {payload.map((pld) => (
                              <div key={pld.dataKey}>
                                <p className="text-[0.70rem] uppercase text-zinc-400">
                                  {pld.dataKey}
                                </p>
                                <p className="text-sm font-bold text-zinc-50">
                                  {abbreviateNumber(pld.value as number)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="Page Views"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorViews)"
                />
                <Area
                  type="monotone"
                  dataKey="Unique Visitors"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorVisitors)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 bg-zinc-900/40 border-zinc-800 backdrop-blur-xl">
          <h3 className="text-lg font-semibold text-white mb-4">Device Distribution</h3>
          <div className="h-[300px] mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deviceStats.map(stat => ({
                name: stat.deviceType,
                value: stat.visits
              }))}>
                <XAxis 
                  dataKey="name" 
                  stroke="#525252" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#525252"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => abbreviateNumber(value)}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0];
                      return (
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2 shadow-md">
                          <p className="text-[0.70rem] uppercase text-zinc-400">
                            {data.payload.name}
                          </p>
                          <p className="text-sm font-bold text-zinc-50">
                            {abbreviateNumber(data.value as number)} visits
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar
                  dataKey="value"
                  fill="#8b5cf6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-zinc-900/40 border-zinc-800 backdrop-blur-xl">
          <div className="p-6 border-b border-zinc-800">
            <h3 className="text-lg font-semibold text-white">Device Types</h3>
          </div>
          <div className="divide-y divide-zinc-800">
            {deviceStats.map((stat) => (
              <div key={stat.deviceType} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium text-white capitalize">{stat.deviceType}</p>
                  <p className="text-sm text-gray-400">{stat.visits} visits</p>
                </div>
                <p className="text-sm font-mono text-gray-400">
                  {calculatePercentage(stat.visits, totalVisits)}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-zinc-900/40 border-zinc-800 backdrop-blur-xl">
          <div className="p-6 border-b border-zinc-800">
            <h3 className="text-lg font-semibold text-white">Operating Systems</h3>
          </div>
          <div className="divide-y divide-zinc-800">
            {osStats.map((stat) => (
              <div key={stat.os} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium text-white">{stat.os}</p>
                  <p className="text-sm text-gray-400">{stat.visits} visits</p>
                </div>
                <p className="text-sm font-mono text-gray-400">
                  {calculatePercentage(stat.visits, totalVisits)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* World Map */}
      <Card className="p-6 bg-zinc-900/40 border-zinc-800 backdrop-blur-xl">
        <h3 className="text-lg font-semibold text-white mb-4">Geographic Distribution</h3>
        <WorldMap data={countryStats} className="h-[400px]" />
      </Card>
    </motion.div>
  );
}