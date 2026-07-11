import { features } from "@/lib/landing/content";
import { iconMap } from "@/lib/landing/icons";

export default function Features() {
  return (
    <section id="features">
      <div className="max-w-[1180px] mx-auto px-7 pt-[92px] pb-5">
        {/* Section header */}
        <div className="text-center max-w-[660px] mx-auto mb-[52px]">
          <span className="text-[13px] font-bold tracking-[0.6px] text-brand uppercase">
            EVERYTHING YOU NEED
          </span>
          <h2 className="text-[44px] font-extrabold tracking-[-1.4px] leading-[1.08] mt-3 mb-4 text-foreground">
            Powerful analytics,<br />refreshingly simple
          </h2>
          <p className="text-[18px] leading-[1.55] text-muted-foreground m-0">
            Every metric that matters, none of the bloat. Set it up in 30 seconds and actually understand your traffic.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[18px]">
          {features.map((feature) => {
            const Icon = iconMap[feature.icon];
            return (
              <div
                key={feature.title}
                className="bg-card border border-border rounded-2xl p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-200 hover:border-brand/30 hover:shadow-[0_10px_30px_-12px_rgba(14,156,110,0.22)] hover:-translate-y-0.5"
              >
                {/* Icon chip */}
                <div
                  className="w-[42px] h-[42px] rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${feature.fg}1F` }}
                >
                  <Icon size={21} style={{ color: feature.fg }} />
                </div>
                {/* Title */}
                <div className="text-[17px] font-bold tracking-[-0.3px] mb-[7px] text-foreground">
                  {feature.title}
                </div>
                {/* Description */}
                <div className="text-[14.5px] leading-[1.55] text-muted-foreground">
                  {feature.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
