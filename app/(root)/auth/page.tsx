import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { BrandSplit } from "@/components/onboarding/brand-split";
import LoginButton from "@/components/auth/login-button";

export const metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default function AuthPage() {
  return (
    <div className="force-light">
      <BrandSplit
        eyebrow="Welcome back"
        title="Analytics that respect your visitors"
        subtitle="Your realtime, privacy-first dashboard is one click away. Sign in to pick up where you left off."
        ticks={["Realtime visitor globe", "No cookies, GDPR-ready", "Script under 1KB"]}
      >
        <div className="mx-auto max-w-sm">
          <h1 className="text-[24px] font-bold tracking-[-0.5px] text-foreground">Sign in to WebSight</h1>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
            Continue to your analytics dashboard. New here? Signing in creates your account automatically.
          </p>

          <div className="mt-7">
            <LoginButton />
          </div>

          <p className="mt-5 text-[11.5px] leading-relaxed text-muted-foreground">
            By continuing you agree to our{" "}
            <Link
              href="/docs/resources/privacy"
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              Privacy Policy
            </Link>
            .
          </p>

          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={14} weight="bold" /> Back to home
          </Link>
        </div>
      </BrandSplit>
    </div>
  );
}
