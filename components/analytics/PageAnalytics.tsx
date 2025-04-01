'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

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
  const abbreviateNumber = (number: number): string => {
    if (number >= 1000000) {
      return (number / 1000000).toFixed(1) + "M";
    } else if (number >= 1000) {
      return (number / 1000).toFixed(1) + "K";
    } else {
      return number.toString();
    }
  };

  return (
    <div className="grid gap-6">
      <Card className="bg-zinc-900/40 border-zinc-800 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white">Most Viewed Pages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={groupedPageViews}>
                <XAxis 
                  dataKey="page" 
                  stroke="#525252" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `/${value}`}
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
                            /{data.payload.page}
                          </p>
                          <p className="text-sm font-bold text-zinc-50">
                            {abbreviateNumber(data.value as number)} visits
                          </p>
                          <p className="text-xs text-zinc-400">
                            {((data.value as number / totalVisits) * 100).toFixed(1)}% of total
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar
                  dataKey="visits"
                  fill="#8B5CF6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4">
            {groupedPageViews.map(({ page, visits }) => (
              <div key={page} className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/40">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white">/{page}</p>
                  <p className="text-sm text-zinc-400">
                    {abbreviateNumber(visits)} {visits === 1 ? 'visit' : 'visits'}
                  </p>
                </div>
                <div className="font-mono text-sm text-zinc-400">{((visits / totalVisits) * 100).toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900/40 border-zinc-800 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white">Traffic Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={groupedPageSources}>
                <XAxis 
                  dataKey="source" 
                  stroke="#525252" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => value || 'Direct'}
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
                            {data.payload.source || 'Direct'}
                          </p>
                          <p className="text-sm font-bold text-zinc-50">
                            {abbreviateNumber(data.value as number)} visits
                          </p>
                          <p className="text-xs text-zinc-400">
                            {((data.value as number / totalVisits) * 100).toFixed(1)}% of total
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar
                  dataKey="visits"
                  fill="#8B5CF6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4">
            {groupedPageSources.map(({ source, visits }) => (
              <div key={source} className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/40">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white">{source || 'Direct'}</p>
                  <p className="text-sm text-zinc-400">
                    {abbreviateNumber(visits)} {visits === 1 ? 'visit' : 'visits'}
                  </p>
                </div>
                <div className="font-mono text-sm text-zinc-400">{((visits / totalVisits) * 100).toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}