/**
 * WebSight brand mark: the "W" drawn as one continuous chart line that ends in
 * a live visitor dot (the same live-dot motif as LiveBadge and the globe
 * markers). White glyph on an emerald tile; `LogoGlyph` is the raw
 * currentColor glyph for dark/brand panels.
 */

export function LogoGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M5.9 11.4 L10.7 21.6 L16 14.2 L21.3 21.6 L26.1 11.4"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="26.1" cy="11.4" r="4.4" stroke="currentColor" strokeWidth="1.1" opacity=".32" />
      <circle cx="26.1" cy="11.4" r="2.5" fill="currentColor" />
    </svg>
  );
}

export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={{ boxShadow: "0 2px 8px rgba(14,156,110,.34)", borderRadius: size * 0.28 }}
    >
      <rect width="32" height="32" rx="9" fill="url(#wsLogoTile)" />
      <rect x=".5" y=".5" width="31" height="31" rx="8.5" stroke="#fff" strokeOpacity=".16" />
      <path
        d="M5.9 11.4 L10.7 21.6 L16 14.2 L21.3 21.6 L26.1 11.4"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="26.1" cy="11.4" r="4.4" stroke="#fff" strokeWidth="1.1" opacity=".35" />
      <circle cx="26.1" cy="11.4" r="2.5" fill="#fff" />
      <defs>
        <linearGradient id="wsLogoTile" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#12A878" />
          <stop offset="1" stopColor="#0B7E58" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="text-[18px] font-bold tracking-[-0.3px] text-foreground">WebSight</span>
    </span>
  );
}
