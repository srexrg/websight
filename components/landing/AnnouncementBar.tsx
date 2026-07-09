import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

export default function AnnouncementBar() {
  return (
    <Link
      href="/auth"
      className="flex items-center justify-center gap-[9px] bg-[#0E1310] text-[#EAF6EF] px-5 py-[9px] text-[13px]"
    >
      <span className="inline-flex items-center gap-1.5 bg-brand text-white text-[10.5px] font-bold tracking-[0.5px] px-2 py-[2px] rounded-[20px]">
        NEW
      </span>
      <span>The live visitor globe is here — watch your traffic spin in realtime</span>
      <ArrowRight size={14} className="text-[#5FD3A6]" />
    </Link>
  );
}
