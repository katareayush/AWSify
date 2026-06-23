import Link from "next/link";
import { ArrowRight, ChevronRight, TerminalSquare } from "lucide-react";
import { HeroArtifact } from "./hero-artifact";
import { CursorGlow } from "./primitives/cursor-glow";

export function Hero() {
  return (
    <section className="relative z-10 flex min-h-[100svh] flex-col justify-center pt-20 sm:pt-20">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 xs:px-5 sm:px-6 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <Eyebrow />
          <Headline />
          <Subhead />
          <CTAs />
          <p className="animate-reveal-fade reveal-delay-4 mt-5 text-[12px] text-white/35">
            No credit card. Connect a repo in 90 seconds.
          </p>
        </div>

        <div className="animate-reveal-up reveal-delay-5 relative mx-auto mt-8 max-w-[25rem] sm:mt-14 sm:max-w-5xl lg:mt-16">
          <CursorGlow />
          <HeroArtifact />
        </div>
      </div>
      <ScrollHint />
    </section>
  );
}

function ScrollHint() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-5 hidden justify-center sm:flex"
    >
      <div className="flex flex-col items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-white/30">
        scroll
        <div className="h-6 w-px bg-gradient-to-b from-white/30 to-transparent" />
      </div>
    </div>
  );
}

function Eyebrow() {
  return (
    <div className="animate-reveal-up inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11.5px] text-white/65 backdrop-blur sm:text-[12px]">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet" />
      </span>
      <span className="truncate">Private beta: ECS Fargate, RDS, S3</span>
      <ChevronRight className="h-3 w-3 opacity-50" />
    </div>
  );
}

function Headline() {
  return (
    <h1 className="animate-reveal-up reveal-delay-1 mt-6 text-balance text-[40px] font-medium leading-[0.98] tracking-tightest text-white xs:text-[48px] sm:mt-7 sm:text-[72px] md:text-[88px] lg:text-[104px]">
      From repository
      <br />
      <span className="text-gradient-sweep">to production AWS.</span>
    </h1>
  );
}

function Subhead() {
  return (
    <p className="animate-reveal-up reveal-delay-2 mx-auto mt-6 max-w-2xl text-balance text-[15.5px] leading-[1.55] text-white/55 sm:mt-8 sm:text-[19px]">
      AWS-ify reads your repository and generates reviewed, production-grade
      infrastructure. Templates execute. You approve. AWS stays yours.
    </p>
  );
}

function CTAs() {
  return (
    <div className="animate-reveal-up reveal-delay-3 mt-8 flex flex-col items-stretch justify-center gap-3 sm:mt-10 sm:flex-row sm:items-center">
      <Link
        href="/onboarding"
        className="group inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-[14px] font-medium text-black transition-transform hover:scale-[1.02]"
      >
        Deploy your first service
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
      <a
        href="#how"
        className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-5 text-[14px] text-white/85 transition-colors hover:bg-white/[0.05]"
      >
        <TerminalSquare className="h-4 w-4 opacity-70" />
        See how it works
      </a>
    </div>
  );
}
