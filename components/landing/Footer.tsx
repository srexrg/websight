import Link from "next/link";
import { GithubLogo, XLogo } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/brand/Logo";
import { footerCols } from "@/lib/landing/content";

export default function Footer() {
  return (
    <footer className="border-t border-[#F0F1F4]">
      {/* 4-column grid */}
      <div className="max-w-[1180px] mx-auto px-7 pt-[54px] pb-10 grid grid-cols-[1.6fr_1fr_1fr_1fr] gap-8">
        {/* Brand column */}
        <div>
          <div className="mb-[13px]">
            <Logo size={28} />
          </div>
          <p className="text-[13.5px] leading-[1.55] text-[#9A9DA8] max-w-[240px]">
            Privacy-first web analytics for people who build on the internet.
          </p>
        </div>

        {/* Data-driven link columns */}
        {footerCols.map((col) => (
          <div key={col.title}>
            <div className="text-[12.5px] font-bold tracking-[0.4px] text-foreground mb-[13px]">
              {col.title}
            </div>
            <div className="flex flex-col gap-[10px]">
              {col.links.map((label) => (
                <Link
                  key={label}
                  href="#"
                  className="text-[13.5px] text-[#6B6E7B] hover:text-brand transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[#F0F1F4]">
        <div className="max-w-[1180px] mx-auto px-7 py-[18px] flex items-center justify-between">
          <span className="text-[13px] text-[#9A9DA8]">
            &copy; 2026 WebSight &middot; MIT licensed
          </span>
          <div className="flex gap-4">
            <Link
              href="https://github.com/srexrg/websight"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="text-[#9A9DA8] hover:text-brand transition-colors"
            >
              <GithubLogo size={18} />
            </Link>
            <Link
              href="https://x.com/srexrg"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X / Twitter"
              className="text-[#9A9DA8] hover:text-brand transition-colors"
            >
              <XLogo size={18} />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
