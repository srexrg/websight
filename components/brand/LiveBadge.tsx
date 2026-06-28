export function LiveBadge({ label = "LIVE" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-brand">
      <span className="h-1.5 w-1.5 rounded-full bg-brand" style={{ animation: "wsBlink 1.4s ease-in-out infinite" }} />
      {label}
    </span>
  );
}
