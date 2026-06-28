import { ChartLineUp } from "@phosphor-icons/react/dist/ssr";

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className="flex items-center justify-center rounded-[9px] bg-brand text-white"
        style={{ width: size, height: size, boxShadow: "0 2px 8px rgba(14,156,110,.34)" }}
      >
        <ChartLineUp size={size * 0.56} weight="bold" />
      </span>
      <span className="text-[18px] font-bold tracking-[-0.3px] text-foreground">WebSight</span>
    </span>
  );
}
