interface DashboardHeroProps {
  githubLogin?: string;
  liveCount: number;
  pendingCount: number;
}

export function DashboardHero({ githubLogin, liveCount, pendingCount }: DashboardHeroProps) {
  const date = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const summary = pendingCount > 0
    ? `${pendingCount} deployment${pendingCount === 1 ? "" : "s"} moving through the pipeline.`
    : liveCount > 0
      ? `${liveCount} live service${liveCount === 1 ? "" : "s"}. All systems steady.`
      : "Connect your source and deploy your first service.";

  return (
    <header className="flex flex-col gap-6 border-b border-white/[0.16] pb-8 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-soft">
          <span className="h-1.5 w-1.5 bg-violet" />Workspace / overview
        </p>
        <h1 className="mt-4 text-[38px] font-semibold leading-[0.95] tracking-[-0.06em] text-white sm:text-[52px]">
          Deployment overview<span className="text-violet">.</span>
        </h1>
        <p className="mt-4 text-[14px] text-white/55">
          {githubLogin ? <span className="font-medium text-white/80">{githubLogin}</span> : "Your workspace"} <span className="mx-2 text-white/25">/</span>{summary}
        </p>
      </div>
      <p className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-white/35">{date}</p>
    </header>
  );
}
