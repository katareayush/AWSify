import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";

interface SetupBannerProps { githubDone: boolean; awsDone: boolean; }

export function SetupBanner({ githubDone, awsDone }: SetupBannerProps) {
  if (githubDone && awsDone) return null;
  const next = !githubDone ? { label: "Connect GitHub", href: "/onboarding" } : { label: "Connect AWS", href: "/connections" };
  return (
    <div className="flex flex-col gap-4 border-l-[3px] border-violet bg-[#241d19] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.13em] text-violet-soft">Action required / setup</p>
        <p className="mt-1 text-[13px] text-white/75">Complete both connections to start deploying from your repositories.</p>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-white/55">
          <span className="flex items-center gap-1.5">{githubDone ? <Check className="h-3 w-3 text-emerald-300" /> : <span className="h-1.5 w-1.5 bg-violet" />}GitHub {githubDone ? "connected" : "pending"}</span>
          <span className="flex items-center gap-1.5">{awsDone ? <Check className="h-3 w-3 text-emerald-300" /> : <span className="h-1.5 w-1.5 bg-violet" />}AWS {awsDone ? "connected" : "pending"}</span>
        </div>
      </div>
      <Link href={next.href} className="inline-flex h-9 shrink-0 items-center justify-center gap-2 self-start border border-violet/50 px-3 font-mono text-[11px] font-semibold uppercase tracking-[0.05em] text-violet-soft transition-colors hover:bg-violet/10 sm:self-auto">
        {next.label}<ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
