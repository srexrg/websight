'use client'

import { Card } from "@/components/ui/card"

interface AnalyticsOverviewProps {
  pageViews: number;
  totalVisits: number;
}

export function AnalyticsOverview({ pageViews, totalVisits }: AnalyticsOverviewProps) {
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
    </div>
  )
}