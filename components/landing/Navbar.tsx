import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { navLinks } from "@/lib/landing/content";

export default function Navbar() {
  return (
    <div className="sticky top-0 z-50 bg-white/[0.86] backdrop-blur-[12px] border-b border-[#F0F1F4]">
      <div className="max-w-[1180px] mx-auto px-7 py-[15px] flex items-center justify-between">
        {/* Left: logo + nav links */}
        <div className="flex items-center gap-[38px]">
          <Link href="/">
            <Logo size={30} />
          </Link>
          <nav className="flex items-center gap-[26px]">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[14px] font-medium text-[#5A5D69] hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: sign in + start free */}
        <div className="flex items-center gap-[14px]">
          <Link
            href="/auth"
            className="text-[14px] font-semibold text-[#3A3D49] hover:text-brand transition-colors"
          >
            Sign in
          </Link>
          <Button asChild className="bg-brand text-white text-[14px] font-semibold px-4 py-[9px] h-auto rounded-[10px] shadow-[0_2px_8px_rgba(14,156,110,0.30)] hover:bg-brand/90 gap-[7px]">
            <Link href="/auth">
              Start free
              <ArrowRight size={14} />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
