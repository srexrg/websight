'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import {
  abbreviateNumber,
  calculateNormalizedPercentage,
} from "@/lib/utils/analytics";

interface PageView {
  page: string;
  visits: number;
}

interface PageSource {
  source: string;
  visits: number;
}

interface PageAnalyticsProps {
  groupedPageViews: PageView[];
  groupedPageSources: PageSource[];
  totalVisits: number;
}

export function PageAnalytics({ groupedPageViews, groupedPageSources, totalVisits }: PageAnalyticsProps) {
  const allPageVisits = groupedPageViews.map((pv) => pv.visits);
  const allSourceVisits = groupedPageSources.map((ps) => ps.visits);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="bg-zinc-900/40 border-zinc-800 hover:border-blue-500/50 transition-all duration-300">
        <CardHeader className="border-b border-zinc-800">
          <CardTitle className="text-lg font-jakarta text-white">Top Pages</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[300px] mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={groupedPageViews.map(({ page, visits }) => ({
                  page,
                  visits,
                }))}
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                <XAxis
                  dataKey="page"
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
                      const percentage = calculateNormalizedPercentage(
                        data.value as number,
                        totalVisits,
                        allPageVisits
                      );
                      return (
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 shadow-xl">
                          <p className="text-[0.70rem] uppercase text-zinc-400">
                            /{data.payload.page}
                          </p>
                          <p className="text-sm font-bold text-zinc-50">
                            {abbreviateNumber(data.value as number)} visits
                          </p>
                          <p className="text-xs text-zinc-400">
                            {percentage.toFixed(1)}% of total
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar
                  dataKey="visits"
                  fill="#2563eb"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="space-y-2">
            {groupedPageViews.map(({ page, visits }) => (
              <div 
                key={page} 
                className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/20 hover:bg-zinc-800/40 transition-colors"
              >
                <div className="space-y-1">
                  <p className="text-sm font-jakarta text-white">/{page}</p>
                  <p className="text-sm text-zinc-400">
                    {abbreviateNumber(visits)} {visits === 1 ? 'visit' : 'visits'}
                  </p>
                </div>
                <div className="text-sm text-zinc-400">
                  {calculateNormalizedPercentage(visits, totalVisits, allPageVisits).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900/40 border-zinc-800 hover:border-blue-500/50 transition-all duration-300">
        <CardHeader className="border-b border-zinc-800">
          <CardTitle className="text-lg font-jakarta text-white">Top Sources</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[300px] mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={groupedPageSources.map(({ source, visits }) => ({
                  source: source || 'Direct',
                  visits,
                }))}
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                <XAxis
                  dataKey="source"
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
                      const percentage = calculateNormalizedPercentage(
                        data.value as number,
                        totalVisits,
                        allSourceVisits
                      );
                      return (
                        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 shadow-xl">
                          <p className="text-[0.70rem] uppercase text-zinc-400">
                            {data.payload.source}
                          </p>
                          <p className="text-sm font-bold text-zinc-50">
                            {abbreviateNumber(data.value as number)} visits
                          </p>
                          <p className="text-xs text-zinc-400">
                            {percentage.toFixed(1)}% of total
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar
                  dataKey="visits"
                  fill="#2563eb"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="space-y-2">
            {groupedPageSources.map(({ source, visits }) => (
              <div 
                key={source} 
                className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/20 hover:bg-zinc-800/40 transition-colors"
              >
                <div className="space-y-1">
                  <p className="text-sm font-jakarta text-white">{source || 'Direct'}</p>
                  <p className="text-sm text-zinc-400">
                    {abbreviateNumber(visits)} {visits === 1 ? 'visit' : 'visits'}
                  </p>
                </div>
                <div className="text-sm text-zinc-400">
                  {calculateNormalizedPercentage(visits, totalVisits, allSourceVisits).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}