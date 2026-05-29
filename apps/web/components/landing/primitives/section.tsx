import type { ReactNode } from "react";
import { Reveal } from "./reveal";

interface SectionProps {
  id?: string;
  eyebrow: string;
  title: string;
  sub?: string;
  children: ReactNode;
}

export function Section({ id, eyebrow, title, sub, children }: SectionProps) {
  return (
    <section id={id} className="relative z-10 border-t border-white/[0.05]">
      <div className="mx-auto max-w-6xl px-6 py-28 sm:py-36">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-violet-soft">
              {eyebrow}
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-5 text-balance text-[40px] font-medium leading-[1.04] tracking-tightest text-white sm:text-[60px]">
              {title}
            </h2>
          </Reveal>
          {sub ? (
            <Reveal delay={160}>
              <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-[1.55] text-white/55">
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
