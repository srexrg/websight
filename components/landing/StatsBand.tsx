import { stats } from "@/lib/landing/content";

export default function StatsBand() {
  return (
    <section className="bg-[#0E1310] border-y border-white/[0.07]">
      <div className="max-w-[1180px] mx-auto px-7 py-[54px] grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="font-mono text-[38px] font-semibold tracking-[-1.5px] text-white">
              {stat.value}
            </div>
            <div className="text-[14px] text-[#8FA89B] mt-[5px]">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
