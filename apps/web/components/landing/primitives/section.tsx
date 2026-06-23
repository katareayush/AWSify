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
    <section id={id} className="relative z-10">
      <div className="mx-auto max-w-7xl px-4 py-20 xs:px-5 sm:px-6 sm:py-36">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-violet-soft">
              {eyebrow}
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-5 text-balance text-[32px] font-medium leading-[1.06] tracking-tightest text-white xs:text-[36px] sm:text-[60px] sm:leading-[1.04]">
              {title}
            </h2>
          </Reveal>
          {sub ? (
            <Reveal delay={160}>
              <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-[1.55] text-white/55 sm:mt-6 sm:text-[16px]">
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
