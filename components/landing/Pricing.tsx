"use client"

import { useState } from "react";
import { Check } from "@phosphor-icons/react/dist/ssr/Check";
import Link from "next/link";
import { plans } from "@/lib/landing/content";

export default function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing">
      <div className="max-w-[1180px] mx-auto px-7 pt-[92px] pb-[92px]">
        {/* Section header */}
        <div className="text-center max-w-[660px] mx-auto mb-[52px]">
          <span className="text-[13px] font-bold tracking-[0.6px] text-brand uppercase">
            PRICING
          </span>
          <h2 className="text-[44px] font-extrabold tracking-[-1.4px] leading-[1.08] mt-3 mb-4 text-foreground">
            Fair pricing for makers
          </h2>
          <p className="text-[18px] leading-[1.55] text-muted-foreground">
            Start free, upgrade when you grow. No hidden fees, no surprises.
          </p>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-3 mb-[52px]">
          <span
            className={`text-[14px] font-semibold transition-colors ${
              annual ? "text-muted-foreground" : "text-foreground"
            }`}
          >
            Monthly
          </span>
          <button
            type="button"
            onClick={() => setAnnual((a) => !a)}
            aria-pressed={annual}
            aria-label="Toggle annual billing"
            className="relative w-12 h-[27px] rounded-full bg-brand cursor-pointer flex items-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            <span
              className="absolute w-[21px] h-[21px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-all duration-200"
              style={{
                left: annual ? "calc(100% - 24px)" : "3px",
              }}
            />
          </button>
          <span
            className={`text-[14px] font-semibold transition-colors ${
              annual ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            Annual{" "}
            <span className="text-brand text-[12.5px]">-20%</span>
          </span>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[18px] items-stretch">
          {plans.map((plan) => {
            const isPopular = plan.popular;
            const price =
              plan.monthly === 0
                ? "$0"
                : `$${annual ? plan.annual : plan.monthly}`;
            const period = plan.monthly === 0 ? "/forever" : "/mo";

            return (
              <div
                key={plan.name}
                className={[
                  "relative rounded-2xl p-[30px] flex flex-col transition-all duration-200",
                  isPopular
                    ? "bg-[#0E1310] ring-1 ring-white/[0.08] shadow-[0_24px_60px_-24px_rgba(14,156,110,0.5)]"
                    : "bg-card border border-border shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:border-brand/30 hover:shadow-[0_10px_30px_-12px_rgba(14,156,110,0.22)] hover:-translate-y-0.5",
                ].join(" ")}
              >
                {/* Popular pill */}
                {isPopular && (
                  <div className="absolute -top-[12px] left-1/2 -translate-x-1/2">
                    <span className="bg-brand text-white text-[11.5px] font-bold tracking-[0.4px] px-[13px] py-[5px] rounded-full">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                {/* Plan name */}
                <div
                  className="text-[13px] font-bold tracking-[0.5px] uppercase mb-[10px]"
                  style={{ color: isPopular ? "#5FD3A6" : undefined }}
                >
                  {isPopular ? (
                    <span style={{ color: "#5FD3A6" }}>{plan.name}</span>
                  ) : (
                    <span className="text-brand">{plan.name}</span>
                  )}
                </div>

                {/* Tagline */}
                <p
                  className={`text-[14.5px] leading-[1.5] mb-5 ${isPopular ? "" : "text-muted-foreground"}`}
                  style={isPopular ? { color: "#8FA89B" } : undefined}
                >
                  {plan.tagline}
                </p>

                {/* Price */}
                <div className="flex items-baseline gap-1 mb-6">
                  <span
                    className={`font-mono text-[44px] font-bold tracking-[-1px] leading-none ${
                      isPopular ? "" : "text-foreground"
                    }`}
                    style={isPopular ? { color: "#fff" } : undefined}
                  >
                    {price}
                  </span>
                  <span
                    className={`text-[14px] ${isPopular ? "" : "text-muted-foreground"}`}
                    style={isPopular ? { color: "#8FA89B" } : undefined}
                  >
                    {period}
                  </span>
                </div>

                {/* Feature list */}
                <ul className="space-y-[10px] mb-8 flex-1">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-[10px]">
                      <Check
                        size={16}
                        weight="bold"
                        className={
                          isPopular ? "text-[#5FD3A6] shrink-0" : "text-brand shrink-0"
                        }
                      />
                      <span
                        className={`text-[14px] ${isPopular ? "" : "text-foreground/80"}`}
                        style={isPopular ? { color: "#C9D6CF" } : undefined}
                      >
                        {feat}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href="/auth"
                  className={[
                    "mt-auto block w-full text-center text-[14.5px] font-semibold rounded-xl py-[13px] px-5 transition-all duration-150",
                    isPopular
                      ? "bg-brand text-white hover:opacity-90"
                      : "bg-card text-foreground border border-border hover:border-brand/30 hover:shadow-sm",
                  ].join(" ")}
                >
                  {plan.cta}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
