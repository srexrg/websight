'use client'

import { Button } from "@/components/ui/button"
import { DownloadIcon } from "lucide-react"
import { exportAnalyticsToPdf } from "@/lib/utils/exportToPdf"
import { 
  GroupedPageView, 
  GroupedSource, 
  DailyStat, 
  DeviceStats, 
  CountryStats, 
  OsStats, 
  TotalStats,
  TrackedEvent
} from '@/lib/types'
import { TimeRange } from '@/lib/actions/analytics'

interface ExportButtonProps {
  domain: string;
  timeRange: TimeRange;
  totalStats: TotalStats;
  dailyStats: DailyStat[];
  groupedPageViews: GroupedPageView[];
  groupedPageSources: GroupedSource[];
  deviceStats: DeviceStats[];
  countryStats: CountryStats[];
  osStats: OsStats[];
  events: TrackedEvent[];
}

export function ExportButton({
  domain,
  timeRange,
  totalStats,
  dailyStats,
  groupedPageViews,
  groupedPageSources,
  deviceStats,
  countryStats,
  osStats,
  events
}: ExportButtonProps) {
  const handleExport = () => {
    exportAnalyticsToPdf({
      domain,
      timeRange: getRangeLabel(timeRange),
      totalStats,
      dailyStats,
      groupedPageViews,
      groupedPageSources,
      deviceStats,
      countryStats,
      osStats,
      events
    });
  };

  return (
    <Button
      variant="outline"
      className="bg-zinc-900/80 hover:bg-zinc-800/90 text-gray-300 hover:text-white border-zinc-700 hover:border-blue-500/50 transition-all duration-300 cursor-pointer"
      onClick={handleExport}
    >
      <DownloadIcon className="mr-2 h-4 w-4" />
      Export Data
    </Button>
  );
}

function getRangeLabel(range: TimeRange) {
  switch (range) {
    case 'today':
      return 'Today'
    case 'yesterday':
      return 'Yesterday'
    case 'last7days':
      return 'Last 7 days'
    case 'last30days':
      return 'Last 30 days'
    case 'last90days':
      return 'Last 90 days'
    default:
      return 'Last 30 days'
  }
} 