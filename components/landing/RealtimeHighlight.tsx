import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { LiveBadge } from "@/components/brand/LiveBadge";
import { liveFeed } from "@/lib/landing/content";
import { iconMap } from "@/lib/landing/icons";

export default function RealtimeHighlight() {
  return (
    <section className="bg-[#FBFCFD] border-t border-border border-b">
      <div className="max-w-[1180px] mx-auto px-7 py-[84px]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[56px] items-center">
          {/* Left column: live activity card */}
          <div className="bg-white border border-border rounded-2xl p-5 shadow-[0_10px_36px_-16px_rgba(16,24,40,0.2)]">
            {/* Card header */}
            <div className="flex items-center justify-between mb-[14px]">
              <span className="text-[14px] font-bold text-foreground">Live activity</span>
              <LiveBadge />
            </div>

            {/* Feed rows */}
            {liveFeed.map((item, i) => {
              const Icon = iconMap[item.icon];
              return (
                <div
                  key={i}
                  className="flex items-center gap-[11px] py-[10px] border-b border-[#F4F4F7]"
                >
                  {/* Icon chip */}
                  <div
                    className="w-[30px] h-[30px] rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: item.tint }}
                  >
                    <Icon size={15} style={{ color: item.fg }} />
                  </div>

                  {/* Page + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-foreground truncate">
                      {item.page}
                    </div>
                    <div className="text-[11.5px] text-[#9A9DA8]">{item.meta}</div>
                  </div>

                  {/* Timestamp */}
                  <span className="font-mono text-[11px] text-[#B3B5BE]">{item.ago}</span>
                </div>
              );
            })}
          </div>

          {/* Right column: copy + CTA */}
          <div>
            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold tracking-[0.5px] text-brand bg-accent px-3 py-[5px] rounded-full">
              REALTIME
            </span>
            <h2 className="text-[38px] font-extrabold tracking-[-1.2px] leading-[1.1] mt-[18px] mb-4 text-foreground">
              Every visit,<br />the instant it happens
            </h2>
            <p className="text-[17px] leading-[1.6] text-[#5A5D69] m-0 mb-[22px]">
              No more refreshing and waiting. Pages, referrers and countries stream in live — so you can watch a launch land in realtime.
            </p>
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 bg-[#1A1B25] hover:bg-brand text-white text-[15px] font-semibold px-5 py-3 rounded-[11px] transition-colors duration-200"
            >
              Open the live dashboard
              <ArrowRight weight="bold" size={15} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
