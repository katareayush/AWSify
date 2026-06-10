import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "../ui/button";

interface DashboardHeroProps {
  githubLogin?: string;
  liveCount: number;
  pendingCount: number;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardHero({ githubLogin, liveCount, pendingCount }: DashboardHeroProps) {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  });

  const summary =
    pendingCount > 0
      ? `${pendingCount} deployment${pendingCount === 1 ? "" : "s"} in flight, ${liveCount} live.`
      : liveCount > 0
        ? `All quiet — ${liveCount} deployment${liveCount === 1 ? "" : "s"} live and healthy.`
        : "Ship your first repository to AWS in a few clicks.";

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-24 h-56 w-[28rem] rounded-full bg-violet/[0.1] blur-[90px]"
      />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-violet-soft">
            {today}
          </p>
          <h1 className="mt-2 text-[26px] font-medium tracking-tight text-white sm:text-[30px]">
            {greeting()}
            {githubLogin ? `, ${githubLogin}` : ""}
          </h1>
          <p className="mt-1.5 text-[13.5px] text-white/50">{summary}</p>
        </div>
        <Button asChild className="shrink-0 self-start sm:self-auto">
          <Link href="/repositories">
            New deployment
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
