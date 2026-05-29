import { ChevronRight } from "lucide-react";
import { Section } from "./primitives/section";
import { faqs } from "./data";

export function FAQ() {
  return (
    <Section id="faq" eyebrow="FAQ" title="Questions, answered.">
      <div className="mx-auto mt-14 max-w-3xl divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.015]">
        {faqs.map((f) => (
          <FAQItem key={f.q} q={f.q} a={f.a} />
        ))}
      </div>
    </Section>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group">
      <summary className="flex cursor-pointer items-center justify-between gap-6 px-6 py-5 transition-colors hover:bg-white/[0.02]">
        <span className="text-[15.5px] font-medium tracking-tight text-white">{q}</span>
        <ChevronRight className="h-4 w-4 text-white/40 transition-transform group-open:rotate-90" />
      </summary>
      <div className="px-6 pb-6 pt-1 text-[14px] leading-[1.65] text-white/60">{a}</div>
    </details>
  );
}
