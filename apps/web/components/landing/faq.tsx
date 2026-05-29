import { Section } from "./primitives/section";
import { faqs } from "./data";

export function FAQ() {
  return (
    <Section id="faq" eyebrow="FAQ" title="Questions, answered.">
      <div className="mx-auto mt-14 max-w-3xl space-y-2.5">
        {faqs.map((f) => (
          <FAQItem key={f.q} q={f.q} a={f.a} />
        ))}
      </div>
    </Section>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02] transition-colors duration-300 open:border-white/[0.14] open:bg-white/[0.04]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-6 px-5 py-5 transition-colors hover:bg-white/[0.02] sm:px-6 sm:py-6 [&::-webkit-details-marker]:hidden">
        <span className="text-[15px] font-medium tracking-tight text-white/85 transition-colors group-open:text-white sm:text-[16px]">
          {q}
        </span>
        <ToggleIcon />
      </summary>
      <div className="px-5 pb-6 pt-1 sm:px-6 sm:pb-7">
        <div className="border-l-2 border-violet/40 pl-4 sm:pl-5">
          <p className="max-w-[58ch] text-[14.5px] leading-[1.75] text-white/65 sm:text-[15px]">
            {a}
          </p>
        </div>
      </div>
    </details>
  );
}

function ToggleIcon() {
  return (
    <span
      aria-hidden
      className="relative flex h-4 w-4 shrink-0 items-center justify-center text-white/55 transition-colors group-open:text-violet-soft"
    >
      <span className="absolute h-px w-3.5 bg-current" />
      <span className="absolute h-3.5 w-px bg-current transition-transform duration-300 ease-out group-open:rotate-90 group-open:opacity-0" />
    </span>
  );
}
