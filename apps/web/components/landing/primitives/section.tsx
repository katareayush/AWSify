import type { ReactNode } from "react";
import { Reveal } from "./reveal";

interface SectionProps {
  id?: string;
  eyebrow: string;
  title: string;
  sub?: string;
  light?: boolean;
  children: ReactNode;
}

export function Section({ id, eyebrow, title, sub, light = false, children }: SectionProps) {
  return (
    <section id={id} className={`relative z-10 ${light ? "bg-[#f0ede6] text-[#0a0a0a]" : "border-t border-white/[0.08]"}`}>
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-32">
        <div className="max-w-4xl">
          <Reveal>
            <p className={`flex items-center gap-3 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] ${light ? "text-[#b92c19]" : "text-violet-soft"}`}><span className={`h-px w-8 ${light ? "bg-[#b92c19]" : "bg-violet"}`} />{eyebrow}</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className={`mt-6 text-balance text-[clamp(2.5rem,6vw,5.5rem)] font-semibold leading-[0.96] tracking-[-0.065em] ${light ? "text-[#0a0a0a]" : "text-white"}`}>
              {title}
            </h2>
          </Reveal>
          {sub ? (
            <Reveal delay={160}>
              <p className={`mt-5 max-w-2xl text-[15px] leading-[1.55] sm:mt-6 sm:text-[16px] ${light ? "text-black/60" : "text-white/55"}`}>
                {sub}
              </p>
            </Reveal>
          ) : null}
        </div>
        <Reveal delay={220}>{children}</Reveal>
      </div>
    </section>
  );
}
