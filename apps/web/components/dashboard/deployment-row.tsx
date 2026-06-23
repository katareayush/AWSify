import Link from "next/link";
import { ChevronRight, GitBranch } from "lucide-react";
import type { Deployment } from "../../lib/api";
import { relativeTime } from "../../lib/utils";

const STATUS: Record<string, { dot: string; text: string; pulse?: boolean }> = {
  deployed: { dot: "bg-emerald-400", text: "text-emerald-300" },
  failed: { dot: "bg-red-400", text: "text-red-300" },
  deploying: { dot: "bg-violet-soft", text: "text-violet-soft", pulse: true },
  destroying: { dot: "bg-amber-300", text: "text-amber-300", pulse: true },
  destroyed: { dot: "bg-white/25", text: "text-white/40" },
  scanning: { dot: "bg-violet-soft", text: "text-violet-soft", pulse: true },
  queued: { dot: "bg-white/40", text: "text-white/55", pulse: true },
  awaiting_approval: { dot: "bg-amber-300", text: "text-amber-300" }
};

function statusLabel(s: string) {
  if (s === "awaiting_approval") return "Awaiting approval";
  if (s === "destroying") return "Destroying";
  if (s === "destroyed") return "Destroyed";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function DeploymentRow({ deployment }: { deployment: Deployment }) {
  const status = STATUS[deployment.status] ?? { dot: "bg-white/40", text: "text-white/55" };
  return (
    <Link
      href={`/deployments/${deployment.id}`}
      className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.025] sm:gap-4"
    >
      <span className="relative flex h-2 w-2 shrink-0">
        {status.pulse && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-50 ${status.dot}`} />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${status.dot}`} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] text-white">{deployment.project.name}</p>
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 truncate text-[11.5px] text-white/40">
          <span className="truncate font-mono">{deployment.project.repoFullName}</span>
          <GitBranch className="h-3 w-3 shrink-0 text-white/25" />
          <span className="truncate font-mono">{deployment.project.branch}</span>
        </p>
      </div>
      <span className="hidden shrink-0 text-[11.5px] text-white/35 sm:block">
        {relativeTime(deployment.updatedAt)}
      </span>
      <span className={`shrink-0 text-[11.5px] font-medium ${status.text}`}>
        {statusLabel(deployment.status)}
      </span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/20 transition-all group-hover:translate-x-0.5 group-hover:text-white/60" />
    </Link>
  );
}
