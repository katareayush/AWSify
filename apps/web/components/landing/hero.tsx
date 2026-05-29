import Link from "next/link";
import { ArrowRight, ChevronRight, TerminalSquare } from "lucide-react";
import { HeroArtifact } from "./hero-artifact";
import { CursorGlow } from "./primitives/cursor-glow";

export function Hero() {
  return (
    <section className="relative z-10 flex min-h-[100svh] flex-col justify-center pt-16 sm:pt-20">
      <div className="mx-auto w-full max-w-6xl px-6 py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-4xl text-center">
          <Eyebrow />
          <Headline />
          <Subhead />
          <CTAs />
          <p className="animate-reveal-fade reveal-delay-4 mt-5 text-[12px] text-white/35">
            No credit card. Connect a repo in 90 seconds.
          </p>
        </div>

        <div className="animate-reveal-up reveal-delay-5 relative mx-auto mt-10 hidden max-w-5xl sm:mt-14 sm:block lg:mt-16">
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
      className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center"
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
    <div className="animate-reveal-up inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[12px] text-white/65 backdrop-blur">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet" />
      </span>
      Private beta — ECS Fargate, RDS, S3
      <ChevronRight className="h-3 w-3 opacity-50" />
    </div>
  );
}

function Headline() {
  return (
    <h1 className="animate-reveal-up reveal-delay-1 mt-7 text-balance text-[44px] font-medium leading-[0.96] tracking-tightest text-white xs:text-[52px] sm:text-[72px] md:text-[88px] lg:text-[104px]">
      From repository
      <br />
      <span className="text-gradient-sweep">to production AWS.</span>
    </h1>
  );
}

function Subhead() {
  return (
    <p className="animate-reveal-up reveal-delay-2 mx-auto mt-8 max-w-2xl text-balance text-[17px] leading-[1.55] text-white/55 sm:text-[19px]">
      Awsify reads your repository and generates reviewed, production-grade
      infrastructure. Templates execute. You approve. AWS stays yours.
    </p>
  );
}

function CTAs() {
  return (
    <div className="animate-reveal-up reveal-delay-3 mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
      <Link
        href="/onboarding"
        className="group inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[14px] font-medium text-black transition-transform hover:scale-[1.02]"
      >
        Deploy your first service
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
      <a
        href="#how"
        className="inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-5 text-[14px] text-white/85 transition-colors hover:bg-white/[0.05]"
      >
        <TerminalSquare className="h-4 w-4 opacity-70" />
        See how it works
      </a>
    </div>
  );
}
