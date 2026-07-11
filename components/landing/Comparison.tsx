import { Check, X } from "@phosphor-icons/react/dist/ssr";
import { LogoMark } from "@/components/brand/Logo";
import { compareRows, type CompareRow } from "@/lib/landing/content";

function Cell({ value, highlight = false }: { value: CompareRow[keyof Omit<CompareRow, "label">]; highlight?: boolean }) {
  if (value === true) {
    return <Check size={16} weight="bold" className={highlight ? "text-brand" : "text-muted-foreground"} />;
  }
  if (value === false) {
    return <X size={14} weight="bold" className="text-muted-foreground/40" />;
  }
  return (
    <span className={`text-[13px] ${highlight ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
      {value}
    </span>
  );
}

export default function Comparison() {
  return (
    <section id="compare" className="bg-card/50 border-y border-border">
      <div className="max-w-[880px] mx-auto px-7 py-[84px]">
        <div className="text-center max-w-[620px] mx-auto mb-[44px]">
          <span className="text-[13px] font-bold tracking-[0.6px] text-brand uppercase">
            WHY SWITCH
          </span>
          <h2 className="text-[40px] font-extrabold tracking-[-1.2px] leading-[1.1] mt-3 mb-[14px] text-foreground">
            Everything GA makes hard,
            <br />
            nothing it makes creepy
          </h2>
          <p className="text-[17px] leading-[1.55] text-muted-foreground m-0">
            The honest comparison against the tools people switch from.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,.04)]">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-4" aria-label="Feature" />
                <th className="bg-accent/50 px-5 py-4">
                  <span className="flex items-center gap-2 text-[13.5px] font-bold text-foreground">
                    <LogoMark size={20} /> WebSight
                  </span>
                </th>
                <th className="px-5 py-4 text-[13.5px] font-semibold text-muted-foreground">
                  Google Analytics
                </th>
                <th className="px-5 py-4 text-[13.5px] font-semibold text-muted-foreground">
                  Plausible
                </th>
              </tr>
            </thead>
            <tbody>
              {compareRows.map((row) => (
                <tr key={row.label} className="border-b border-border/60 last:border-b-0">
                  <td className="px-5 py-3 text-[13px] font-medium text-foreground">{row.label}</td>
                  <td className="bg-accent/50 px-5 py-3">
                    <Cell value={row.websight} highlight />
                  </td>
                  <td className="px-5 py-3">
                    <Cell value={row.ga} />
                  </td>
                  <td className="px-5 py-3">
                    <Cell value={row.plausible} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
