import { CheckCircle } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import InteractiveGlobe from "@/components/landing/InteractiveGlobe";
import { globePoints } from "@/lib/landing/content";

export default function GlobeHighlight() {
  return (
    <section id="globe">
      <div className="max-w-[1180px] mx-auto px-7 py-[84px]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[56px] items-center">
          {/* Left column: copy */}
          <div>
            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold tracking-[0.5px] text-brand bg-accent px-3 py-[5px] rounded-full">
              LIVE GLOBE
            </span>
            <h2 className="text-[38px] font-extrabold tracking-[-1.2px] leading-[1.1] mt-[18px] mb-4 text-foreground">
              See the world<br />visit your site
            </h2>
            <p className="text-[17px] leading-[1.6] text-[#5A5D69] m-0 mb-[22px]">
              Watch visitors light up across a real, spinning globe the moment they land. Drag to rotate, pause anytime, and tap a marker to see who&apos;s reading right now.
            </p>
            <div className="flex flex-col gap-[13px]">
              {globePoints.map((point) => (
                <div key={point} className="flex items-start gap-[11px]">
                  <CheckCircle
                    weight="fill"
                    size={19}
                    className="text-brand flex-shrink-0 mt-[1px]"
                  />
                  <span className="text-[15px] text-[#33353F] leading-[1.5]">{point}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right column: interactive 3D globe with radial glow */}
          <div className="relative flex items-center justify-center min-h-[460px]">
            {/* Radial emerald glow */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, rgba(14,156,110,0.12), rgba(14,156,110,0) 62%)",
              }}
            />
            <InteractiveGlobe />
          </div>
        </div>
      </div>
    </section>
  );
}
