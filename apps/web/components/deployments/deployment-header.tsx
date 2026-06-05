import Link from "next/link";
import { Calendar, ExternalLink, GitBranch, Github, Loader2 } from "lucide-react";

interface InfoChip {
  icon?: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}

interface DeploymentHeaderProps {
  projectName: string;
  repoFullName: string;
  branch: string;
  createdAt: string;
  status: string;
  isRunning: boolean;
  liveUrl?: string | null;
  chips?: InfoChip[];
  action?: React.ReactNode;
}

function statusTone(s: string) {
  if (s === "deployed") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (s === "failed") return "border-red-500/30 bg-red-500/10 text-red-300";
  if (s === "awaiting_approval") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  if (["queued", "scanning", "deploying"].includes(s)) return "border-violet/30 bg-violet/10 text-violet-soft";
  return "border-white/[0.08] bg-white/[0.04] text-white/65";
}

function statusLabel(s: string) {
  if (s === "awaiting_approval") return "Awaiting approval";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function DeploymentHeader({
  projectName,
  repoFullName,
  branch,
  createdAt,
  status,
  isRunning,
  liveUrl,
  chips = [],
  action
}: DeploymentHeaderProps) {
  const baseChips: InfoChip[] = [
    {
      icon: <Github className="h-3 w-3" />,
      label: "Repo",
      value: repoFullName,
      mono: true
    },
    {
      icon: <GitBranch className="h-3 w-3" />,
      label: "Branch",
      value: branch,
      mono: true
    },
    {
      icon: <Calendar className="h-3 w-3" />,
      label: "Created",
      value: new Date(createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    }
  ];

  const allChips = [...baseChips, ...chips];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-violet-soft">
            Deployment
          </p>
          <h1 className="mt-2 truncate text-[26px] font-medium tracking-tight text-white sm:text-[30px]">
            {projectName}
          </h1>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium ${statusTone(status)}`}>
            {isRunning && <Loader2 className="h-3 w-3 animate-spin" />}
            {statusLabel(status)}
          </span>
          {action}
        </div>
      </div>

      {liveUrl && (
        <Link
          href={liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex min-w-0 items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2 text-[13px] text-emerald-200 transition-colors hover:bg-emerald-500/[0.1]"
        >
          <span className="shrink-0 font-mono text-[10.5px] uppercase tracking-wider text-emerald-300/70">Live</span>
          <span className="min-w-0 flex-1 truncate font-mono text-emerald-200/90">{liveUrl}</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-emerald-300/70 transition-colors group-hover:text-emerald-200" />
        </Link>
      )}

      <div className="flex flex-wrap gap-1.5">
        {allChips.map((chip) => (
          <span
            key={chip.label}
            className="inline-flex min-w-0 items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[11.5px] text-white/55"
          >
            {chip.icon}
            <span className="text-white/35">{chip.label}</span>
            <span className={`min-w-0 truncate ${chip.mono ? "font-mono text-white/75" : "text-white/75"}`} title={chip.value}>
              {chip.value}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
