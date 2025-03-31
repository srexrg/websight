'use client'

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

interface AnalyticsOverviewProps {
  pageViews: number;
  totalVisits: number;
  uniqueVisitors: number;
  averageSessionDuration?: number;
  bounceRate?: number;
  deviceStats?: DeviceStats[];
  countryStats?: CountryStats[];
  osStats?: OsStats[];
}

export function AnalyticsOverview({ 
  pageViews, 
  totalVisits, 
  uniqueVisitors,
  averageSessionDuration,
  bounceRate,
  deviceStats = [],
  countryStats = [],
  osStats = []
}: AnalyticsOverviewProps) {
  
  function formatDuration(seconds: number): string {
    if (!seconds) return '0s';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    if (minutes === 0) return `${remainingSeconds}s`;
    return `${minutes}m ${remainingSeconds}s`;
  }

  function calculatePercentage(visits: number, totalVisits: number): string {
    if (!totalVisits) return '0%';
    const percentage = (visits / totalVisits) * 100;
    return `${percentage.toFixed(1)}%`;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col space-y-1">
              <span className="text-2xl font-bold">{totalVisits}</span>
              <span className="text-sm text-muted-foreground">Total Visits</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col space-y-1">
              <span className="text-2xl font-bold">{pageViews}</span>
              <span className="text-sm text-muted-foreground">Page Views</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col space-y-1">
              <span className="text-2xl font-bold">{averageSessionDuration ? formatDuration(averageSessionDuration) : '-'}</span>
              <span className="text-sm text-muted-foreground">Avg. Session Duration</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col space-y-1">
              <span className="text-2xl font-bold">{bounceRate ? `${bounceRate.toFixed(1)}%` : '-'}</span>
              <span className="text-sm text-muted-foreground">Bounce Rate</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <p className="font-medium text-muted-foreground p-6 border-b border-border">
            DEVICE TYPES
          </p>
          <div className="divide-y">
            {deviceStats.map((stat) => (
              <div key={stat.deviceType} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium capitalize">{stat.deviceType}</p>
                  <p className="text-sm text-muted-foreground">{stat.visits} visits</p>
                </div>
                <p className="text-sm font-mono">
                  {calculatePercentage(stat.visits, totalVisits)}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <p className="font-medium text-muted-foreground p-6 border-b border-border">
            OPERATING SYSTEMS
          </p>
          <div className="divide-y">
            {osStats.map((stat) => (
              <div key={stat.os} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">{stat.os}</p>
                  <p className="text-sm text-muted-foreground">{stat.visits} visits</p>
                </div>
                <p className="text-sm font-mono">
                  {calculatePercentage(stat.visits, totalVisits)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <TabsContent value="locations" className="space-y-6">
        <Card>
          <p className="font-medium text-muted-foreground p-6 border-b border-border">
            TOP COUNTRIES
          </p>
          <div className="divide-y">
            {countryStats.map((stat) => (
              <div key={stat.country} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">{stat.country}</p>
                  <p className="text-sm text-muted-foreground">{stat.visits} visits</p>
                </div>
                <p className="text-sm font-mono">
                  {calculatePercentage(stat.visits, totalVisits)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </TabsContent>
    </div>
  );
}