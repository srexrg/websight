import { Star } from "@phosphor-icons/react/dist/ssr";

export default function Testimonial() {
  return (
    <div className="bg-card/50 border-t border-border border-b">
      <div className="max-w-[820px] mx-auto px-7 py-[74px] text-center">
        {/* 5 stars */}
        <div className="flex justify-center gap-[3px] mb-[22px]">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} size={20} weight="fill" color="#F5A623" />
          ))}
        </div>

        {/* Quote */}
        <p className="text-[26px] font-semibold leading-[1.4] tracking-[-0.6px] text-foreground mb-[26px] text-balance">
          &ldquo;I dropped Google Analytics the day I tried WebSight. The realtime globe alone makes launch days actually fun &mdash; and my visitors aren&apos;t tracked across the web anymore.&rdquo;
        </p>

        {/* Avatar + name/role */}
        <div className="flex items-center justify-center gap-3">
          <div
            className="w-[46px] h-[46px] rounded-full flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#0E9C6E,#5FD3A6)" }}
          />
          <div className="text-left">
            <div className="text-[15px] font-bold text-foreground">Maya Lin</div>
            <div className="text-[13.5px] text-muted-foreground">Founder, Driftpad &middot; indie SaaS</div>
          </div>
        </div>
      </div>
    </div>
  );
}
