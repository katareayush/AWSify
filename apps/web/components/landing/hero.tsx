import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { HeroArtifact } from "./hero-artifact";

export function Hero() {
  return (
    <section className="landing-hero relative z-10 overflow-hidden bg-[#ed462d] text-[#0a0a0a]">
      <div className="pointer-events-none absolute inset-0 landing-hero-grid" aria-hidden />
      <div className="relative mx-auto max-w-[1440px] px-5 pb-0 pt-36 sm:px-8 sm:pt-44 lg:px-12">
        <div className="grid grid-cols-[minmax(0,1fr)] items-end gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-12">
          <div className="min-w-0 pb-7 lg:pb-20">
            <div className="flex items-center gap-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em]">
              <span className="h-2 w-2 bg-[#0a0a0a]" />
              Infrastructure, without the maze
              <span className="ml-auto hidden opacity-60 sm:inline">001 / DEPLOY</span>
            </div>
            <h1 className="mt-8 max-w-[850px] font-sans text-[clamp(3.5rem,7vw,7.75rem)] font-semibold leading-[0.86] tracking-[-0.075em]">
              Your code.<br />
              <span className="outline-type">Real cloud.</span><br />
              Zero maze.
            </h1>
            <div className="mt-8 grid gap-7 border-t border-black/25 pt-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <p className="max-w-md text-[16px] font-medium leading-[1.5] sm:text-[18px]">
                Turn a GitHub repository into reviewed, production-ready AWS infrastructure. See the plan, approve the resources, and ship on your terms.
              </p>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Link href="/onboarding" className="group inline-flex h-12 items-center gap-3 bg-[#0a0a0a] px-5 text-[13px] font-semibold uppercase tracking-[0.05em] text-[#f0ede6] transition-colors hover:bg-[#25211e]">
                  Start deploying <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
                <a href="#how" className="inline-flex h-12 items-center gap-2 border border-black/35 px-4 text-[13px] font-semibold uppercase tracking-[0.05em] transition-colors hover:bg-black/10">
                  Explore <ArrowDownRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
          <div className="relative min-w-0">
            <div className="mb-3 flex items-center justify-between font-mono text-[10px] font-semibold uppercase tracking-[0.14em]">
              <span>Live preview / AWS-ify control plane</span>
              <span>↗ 01</span>
            </div>
            <HeroArtifact />
          </div>
        </div>
      </div>
      <div className="relative mt-12 overflow-hidden border-t border-black/20 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] lg:mt-0">
        <div className="mx-auto flex max-w-[1440px] flex-wrap gap-x-10 gap-y-2 px-5 sm:px-8 lg:px-12">
          <span>01 / Connect repository</span><span>02 / Review the plan</span><span>03 / Deploy to your AWS</span>
          <span className="ml-auto hidden lg:inline">No console required ↗</span>
        </div>
      </div>
    </section>
  );
}
