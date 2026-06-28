import { logos } from "@/lib/landing/content";
import { iconMap } from "@/lib/landing/icons";

export default function TrustBar() {
  return (
    <div className="border-t border-border border-b bg-[#FBFCFD]">
      <div className="max-w-[1180px] mx-auto px-7 py-[26px] flex flex-col items-center gap-4">
        <span className="text-[12px] font-semibold tracking-[1px] text-[#A4A7B2] uppercase">
          TRUSTED BY 12,000+ INDIE MAKERS &amp; TEAMS
        </span>
        <div className="flex items-center justify-center gap-10 flex-wrap opacity-[0.62]">
          {logos.map((logo) => {
            const Icon = iconMap[logo.icon];
            return (
              <span
                key={logo.name}
                className="inline-flex items-center gap-2 text-[18px] font-bold tracking-[-0.4px] text-[#5A5D69]"
              >
                <Icon size={19} />
                {logo.name}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
