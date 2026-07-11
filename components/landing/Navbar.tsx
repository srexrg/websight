import Link from "next/link";
import { ArrowRight, GithubLogo, Star } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/landing/ThemeToggle";
import { navLinks } from "@/lib/landing/content";

/** Star count for the nav pill; cached an hour, null on any failure. */
async function githubStars(): Promise<number | null> {
  try {
    const res = await fetch("https://api.github.com/repos/srexrg/websight", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { stargazers_count?: number };
    return typeof data.stargazers_count === "number" ? data.stargazers_count : null;
  } catch {
    return null;
  }
}

function formatStars(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);
}

export default async function Navbar() {
  const stars = await githubStars();
  return (
    <div className="sticky top-0 z-50 bg-background/85 backdrop-blur-[12px] border-b border-border">
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
                className="text-[14px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: GitHub + theme + sign in + start free */}
        <div className="flex items-center gap-[14px]">
          <Link
            href="https://github.com/srexrg/websight"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Star WebSight on GitHub"
            className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:border-brand/30 hover:text-foreground"
          >
            <GithubLogo size={15} />
            {stars !== null ? (
              <>
                <Star size={11} weight="fill" className="text-brand" />
                <span className="font-mono">{formatStars(stars)}</span>
              </>
            ) : (
              "GitHub"
            )}
          </Link>
          <ThemeToggle />
          <span className="h-4 w-px bg-border" aria-hidden />
          <Link
            href="/auth"
            className="text-[14px] font-semibold text-foreground/80 hover:text-brand transition-colors"
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
