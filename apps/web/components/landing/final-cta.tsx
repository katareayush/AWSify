import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="relative z-10">
      <div className="mx-auto max-w-7xl px-6 pb-32 pt-28">
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#070708] px-8 py-20 text-center sm:px-16">
          <div className="pointer-events-none absolute inset-0 bg-grid-fine opacity-60" />
          <div className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[820px] -translate-x-1/2 violet-glow opacity-80" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px divider-x" />

          <div className="relative">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-violet-soft">
              ready when you are
            </p>
            <h2 className="mx-auto mt-6 max-w-3xl text-balance text-[44px] font-medium leading-[1.02] tracking-tightest text-white sm:text-[68px]">
              The console was never the point.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-[16px] leading-[1.55] text-white/55">
              Ship infrastructure the same way you ship code. Connect a repository
              and have your first reviewed deployment plan in under five minutes.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/onboarding"
                className="group inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-[14.5px] font-medium text-black transition-transform hover:scale-[1.02]"
              >
                Start deploying
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-6 text-[14.5px] text-white/85 transition-colors hover:bg-white/[0.05]"
              >
                View the dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
