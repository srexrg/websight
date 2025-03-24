'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

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
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Most Viewed Pages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {groupedPageViews.map(({ page, visits }) => (
              <div key={page} className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">/{page}</p>
                  <p className="text-sm text-muted-foreground">
                    {visits} {visits === 1 ? 'visit' : 'visits'}
                  </p>
                </div>
                <div className="font-mono text-sm text-muted-foreground">{((visits / totalVisits) * 100).toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Traffic Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {groupedPageSources.map(({ source, visits }) => (
              <div key={source} className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{source || 'Direct'}</p>
                  <p className="text-sm text-muted-foreground">
                    {visits} {visits === 1 ? 'visit' : 'visits'}
                  </p>
                </div>
                <div className="font-mono text-sm text-muted-foreground">{((visits / totalVisits) * 100).toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}