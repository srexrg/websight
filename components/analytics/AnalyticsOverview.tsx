'use client'

import { Card } from "@/components/ui/card";
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
  deviceStats?: DeviceStats[];
  countryStats?: CountryStats[];
  osStats?: OsStats[];
}

export function AnalyticsOverview({ 
  pageViews, 
  totalVisits, 
  uniqueVisitors,
  deviceStats = [],
  countryStats = [],
  osStats = []
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

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min ${Math.floor(seconds % 60)} sec`;
  };

  const calculatePercentage = (value: number, total: number): string => {
    return total > 0 ? ((value / total) * 100).toFixed(1) + "%" : "0%";
  };

  return (
    <Tabs defaultValue="overview" className="w-full space-y-6">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="devices">Devices</TabsTrigger>
        <TabsTrigger value="locations">Locations</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-border text-center">
            <p className="text-muted-foreground font-medium py-8 w-full text-center border-b border-border">
              TOTAL VISITS
            </p>
            <p className="py-12 text-3xl lg:text-4xl font-bold">
              {abbreviateNumber(totalVisits)}
            </p>
          </Card>
          <Card className="border-border text-center">
            <p className="font-medium text-muted-foreground py-8 w-full text-center border-b border-border">
              PAGE VIEWS
            </p>
            <p className="py-12 text-3xl lg:text-4xl font-bold">
              {abbreviateNumber(pageViews)}
            </p>
          </Card>
          <Card className="border-border text-center">
            <p className="font-medium text-muted-foreground py-8 w-full text-center border-b border-border">
              UNIQUE VISITORS
            </p>
            <p className="py-12 text-3xl lg:text-4xl font-bold">
              {abbreviateNumber(uniqueVisitors)}
            </p>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="devices" className="space-y-6">
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
      </TabsContent>

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
    </Tabs>
  );
}