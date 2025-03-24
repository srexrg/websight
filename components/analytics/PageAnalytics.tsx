'use client'


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
}

export function PageAnalytics({ groupedPageViews, groupedPageSources }: PageAnalyticsProps) {
  return (
    <div className="items-center justify-center grid grid-cols-1 bg-black lg:grid-cols-2 mt-12 w-full border-y border-white/5">
      {/* Top pages */}
      <div className="flex flex-col bg-black z-40 h-full w-full">
        <h1 className="text-white/70 font-medium py-8 w-full text-center border-b border-white/5">Top Pages</h1>
        {groupedPageViews.map((view) => (
          <div
            key={view.page}
            className="text-white w-full items-center justify-between px-6 py-4 border-b border-white/5 flex"
          >
            <p className="text-white/70 font-light">/{view.page}</p>
            <p className="">{view.visits}</p>
          </div>
        ))}
      </div>
      {/* Top sources */}
      <div className="flex flex-col bg-black z-40 h-full w-full lg:border-l border-t lg:border-t-0 border-white/5">
        <h1 className="text-white/70 font-medium py-8 w-full text-center border-b border-white/5 relative">
          Top Visit Sources
          <p className="absolute bottom-2 right-2 text-[10px] italic font-light">
            add ?utm={"{source}"} to track
          </p>
        </h1>
        {groupedPageSources.map((source) => (
          <div
            key={source.source}
            className="text-white w-full items-center justify-between px-6 py-4 border-b border-white/5 flex"
          >
            <p className="text-white/70 font-light">/{source.source}</p>
            <p className="">{source.visits}</p>
          </div>
        ))}
      </div>
    </div>
  )
}