import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqs } from "@/lib/landing/content";

export default function Faq() {
  return (
    <section id="faq">
      <div className="max-w-[680px] mx-auto px-7 py-[84px]">
        <div className="text-center mb-[36px]">
          <span className="text-[13px] font-bold tracking-[0.6px] text-brand uppercase">FAQ</span>
          <h2 className="text-[38px] font-extrabold tracking-[-1.2px] leading-[1.1] mt-3 text-foreground">
            Questions, answered
          </h2>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((item) => (
            <AccordionItem key={item.q} value={item.q} className="border-border/70">
              <AccordionTrigger className="py-[18px] text-[15px] font-semibold text-foreground hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="pb-[18px] text-[14px] leading-[1.6] text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <p className="mt-7 text-center text-[13.5px] text-muted-foreground">
          Something else?{" "}
          <Link
            href="https://github.com/srexrg/websight/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-brand hover:underline"
          >
            Open an issue on GitHub
          </Link>{" "}
          and we&apos;ll get back to you.
        </p>
      </div>
    </section>
  );
}
