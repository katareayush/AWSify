import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="relative z-10">
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-16 xs:px-5 sm:px-6 sm:pb-32 sm:pt-28">
        <div className="relative overflow-hidden border border-white/[0.08] bg-[#ed462d] px-5 py-14 text-left text-[#0a0a0a] sm:px-16 sm:py-20">
          <div className="pointer-events-none absolute inset-0 landing-hero-grid opacity-60" />

          <div className="relative">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em]">
              04 / Your move
            </p>
            <h2 className="mt-6 max-w-4xl text-balance text-[44px] font-semibold leading-[0.94] tracking-[-0.065em] xs:text-[52px] sm:text-[84px]">
              Build the thing.<br />We&apos;ll handle the cloud.
            </h2>
            <p className="mt-7 max-w-xl text-[15px] font-medium leading-[1.55] sm:text-[17px]">
              Ship infrastructure the same way you ship code. Connect a repository
              and have your first reviewed deployment plan in under five minutes.
            </p>
            <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <Link
                href="/onboarding"
                className="group inline-flex h-12 items-center justify-center gap-2 bg-[#0a0a0a] px-6 font-mono text-[12px] font-semibold uppercase tracking-[0.06em] text-[#f0ede6] transition-colors hover:bg-[#25211e]"
              >
                Start deploying
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex h-12 items-center justify-center gap-2 border border-black/30 px-6 font-mono text-[12px] font-semibold uppercase tracking-[0.06em] transition-colors hover:bg-black/10"
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
