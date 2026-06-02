"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Section } from "./primitives/section";
import { faqs } from "./data";

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <Section id="faq" eyebrow="FAQ" title="Questions, answered.">
      <div className="mx-auto mt-14 max-w-3xl">
        {faqs.map((f, i) => (
          <FAQItem
            key={f.q}
            q={f.q}
            a={f.a}
            isOpen={openIndex === i}
            onToggle={() => setOpenIndex(openIndex === i ? null : i)}
          />
        ))}
      </div>
    </Section>
  );
}

interface FAQItemProps {
  q: string;
  a: string;
  isOpen: boolean;
  onToggle: () => void;
}

function FAQItem({ q, a, isOpen, onToggle }: FAQItemProps) {
  return (
    <div className="border-b border-white/[0.06] last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="group flex w-full items-center justify-between gap-6 py-7 text-left transition-colors"
      >
        <span
          className={`text-[16px] font-medium tracking-tight transition-colors sm:text-[17px] ${
            isOpen ? "text-white" : "text-white/80 group-hover:text-white"
          }`}
        >
          {q}
        </span>
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
            isOpen
              ? "border-violet/40 bg-violet/10 text-violet-soft"
              : "border-white/10 bg-white/[0.02] text-white/55 group-hover:border-white/20 group-hover:text-white"
          }`}
        >
          <Plus
            className={`h-3.5 w-3.5 transition-transform duration-300 ease-out ${
              isOpen ? "rotate-45" : ""
            }`}
          />
        </span>
      </button>
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="max-w-[60ch] pb-7 pr-12 text-[15px] leading-[1.7] text-white/60">
            {a}
          </p>
        </div>
      </div>
    </div>
  );
}
