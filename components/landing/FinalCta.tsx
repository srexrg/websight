import Link from "next/link";
import { ArrowRight, GithubLogo } from "@phosphor-icons/react/dist/ssr";

export default function FinalCta() {
  return (
    <div className="max-w-[1180px] mx-auto px-7 py-24">
      <div
        className="relative bg-[#0E1310] ring-1 ring-white/[0.08] rounded-[24px] px-10 py-[66px] text-center overflow-hidden"
      >
        {/* Radial emerald glow */}
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2"
          style={{
            top: "-120px",
            width: "560px",
            height: "560px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(14,156,110,0.32), rgba(14,156,110,0) 60%)",
          }}
        />

        <div className="relative">
          <h2 className="text-[46px] font-extrabold tracking-[-1.6px] leading-[1.06] text-white mb-4">
            Understand your traffic
            <br />
            in the next 5 minutes
          </h2>
          <p className="text-[18px] text-[#9FB3AA] mb-[30px] mx-auto max-w-[500px] leading-[1.5]">
            Free for your first 10k events a month. No card, no cookie banner, no nonsense.
          </p>
          <div className="flex items-center justify-center gap-[13px]">
            {/* Emerald CTA */}
            <Link
              href="/auth"
              className="flex items-center gap-2 bg-brand text-white text-[16px] font-semibold px-[26px] py-[14px] rounded-[12px] shadow-[0_6px_20px_rgba(14,156,110,0.40)] hover:bg-brand/90 transition-colors"
            >
              Start tracking free
              <ArrowRight size={16} weight="bold" />
            </Link>

            {/* GitHub outline */}
            <Link
              href="https://github.com/srexrg/websight"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-transparent border border-[#2C322E] text-[#EAF6EF] text-[16px] font-semibold px-6 py-[14px] rounded-[12px] hover:border-brand transition-colors"
            >
              <GithubLogo size={18} />
              Star on GitHub
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
