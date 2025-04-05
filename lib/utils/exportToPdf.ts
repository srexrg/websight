import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { 
  GroupedPageView, 
  GroupedSource, 
  DailyStat, 
  DeviceStats, 
  CountryStats, 
  OsStats, 
  TotalStats,
  TrackedEvent
} from '@/lib/types';

// Define the autoTable options type
interface AutoTableOptions {
  startY: number;
  head: string[][];
  body: string[][];
  theme?: string;
  headStyles?: {
    fillColor?: number[];
  };
  alternateRowStyles?: {
    fillColor?: number[];
  };
}

// Extend jsPDF type to include autoTable
interface JsPDFWithAutoTable extends jsPDF {
  autoTable: (options: AutoTableOptions) => void;
}

interface ExportData {
  domain: string;
  timeRange: string;
  totalStats: TotalStats;
  dailyStats: DailyStat[];
  groupedPageViews: GroupedPageView[];
  groupedPageSources: GroupedSource[];
  deviceStats: DeviceStats[];
  countryStats: CountryStats[];
  osStats: OsStats[];
  events: TrackedEvent[];
}

export function exportAnalyticsToPdf(data: ExportData): void {
  const { 
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
  } = data;

  
  const doc = new jsPDF() as JsPDFWithAutoTable;
  
  
  doc.setProperties({
    title: `${domain} Analytics Report`,
    subject: `Analytics data for ${domain}`,
    author: 'Websight Analytics',
    keywords: 'analytics, website, traffic, report',
    creator: 'Websight Analytics'
  });

  
  doc.setFontSize(20);
  doc.text(`${domain} Analytics Report`, 14, 20);
  

  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Time Range: ${timeRange}`, 14, 30);
  
  
  const now = new Date();
  doc.text(`Generated on: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 14, 37);
  

  doc.setDrawColor(200);
  doc.line(14, 42, 196, 42);
  

  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text('Summary', 14, 55);
  
  doc.setFontSize(12);
  doc.text(`Total Visits: ${totalStats.visits}`, 14, 65);
  doc.text(`Unique Visitors: ${totalStats.unique_visitors}`, 14, 72);
  doc.text(`Page Views: ${totalStats.page_views}`, 14, 79);
  
  
  if (dailyStats.length > 0) {
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Daily Statistics', 14, 20);
    
    
    const tableData = dailyStats.map(stat => [
      new Date(stat.date).toLocaleDateString(),
      stat.visits.toString(),
      stat.unique_visitors.toString(),
      stat.page_views.toString()
    ]);
    
    
    doc.autoTable({
      startY: 30,
      head: [['Date', 'Visits', 'Unique Visitors', 'Page Views']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });
  }
  
  
  if (groupedPageViews.length > 0) {
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Top Pages', 14, 20);
    
    const tableData = groupedPageViews
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 20)
      .map(view => [view.page, view.visits.toString()]);
    
    
    doc.autoTable({
      startY: 30,
      head: [['Page', 'Visits']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });
  }
  
  
  if (groupedPageSources.length > 0) {
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Traffic Sources', 14, 20);
    
    const tableData = groupedPageSources
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 20)
      .map(source => [source.source, source.visits.toString()]);
    
    doc.autoTable({
      startY: 30,
      head: [['Source', 'Visits']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });
  }
  
  
  if (deviceStats.length > 0) {
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Device Statistics', 14, 20);
    
    const tableData = deviceStats
      .sort((a, b) => b.visits - a.visits)
      .map(stat => [stat.deviceType, stat.visits.toString()]);
    
    doc.autoTable({
      startY: 30,
      head: [['Device Type', 'Visits']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });
  }
  
  if (countryStats.length > 0) {
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Country Statistics', 14, 20);
    
    const tableData = countryStats
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 20)
      .map(stat => [stat.country, stat.visits.toString()]);
    
    doc.autoTable({
      startY: 30,
      head: [['Country', 'Visits']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });
  }
  
  if (osStats.length > 0) {
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Operating System Statistics', 14, 20);
    
    
    const tableData = osStats
      .sort((a, b) => b.visits - a.visits)
      .map(stat => [stat.os, stat.visits.toString()]);
    
    
    doc.autoTable({
      startY: 30,
      head: [['Operating System', 'Visits']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });
  }
  
  
  if (events.length > 0) {
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Custom Events', 14, 20);
    
    
    const tableData = events
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 50)
      .map(event => [
        event.event_name,
        event.message || '',
        new Date(event.created_at).toLocaleString()
      ]);
    

    doc.autoTable({
      startY: 30,
      head: [['Event Name', 'Message', 'Date']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [66, 139, 202] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });
  }
  
  doc.save(`${domain}-analytics-${timeRange.replace(/\s+/g, '-').toLowerCase()}.pdf`);
} 