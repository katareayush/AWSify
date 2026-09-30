import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Deployment } from "../../lib/api";
import { relativeTime } from "../../lib/utils";

const STATUS: Record<string, { dot: string; text: string }> = {
  deployed: { dot: "bg-emerald-400", text: "text-emerald-300" },
  failed: { dot: "bg-red-400", text: "text-red-300" },
  deploying: { dot: "bg-violet", text: "text-violet-soft" },
  destroying: { dot: "bg-amber-300", text: "text-amber-300" },
  destroyed: { dot: "bg-white/30", text: "text-white/50" },
  scanning: { dot: "bg-violet", text: "text-violet-soft" },
  queued: { dot: "bg-white/50", text: "text-white/60" },
  awaiting_approval: { dot: "bg-amber-300", text: "text-amber-300" }
};

function statusLabel(status: string) {
  if (status === "awaiting_approval") return "Awaiting approval";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function DeploymentRow({ deployment }: { deployment: Deployment }) {
  const status = STATUS[deployment.status] ?? { dot: "bg-white/50", text: "text-white/60" };
  return (
    <Link href={`/deployments/${deployment.id}`} className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-white/[0.1] px-5 py-4 transition-colors hover:bg-white/[0.035] sm:grid-cols-[minmax(0,1fr)_100px_120px_16px]">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-white group-hover:text-violet-soft">{deployment.project.name}</p>
        <p className="mt-1 truncate font-mono text-[10px] text-white/40">{deployment.project.repoFullName} / {deployment.project.branch}</p>
      </div>
      <span className="hidden font-mono text-[10px] text-white/40 sm:block">{relativeTime(deployment.updatedAt)}</span>
      <span className={`flex items-center gap-2 text-[11px] font-medium ${status.text}`}><span className={`h-1.5 w-1.5 shrink-0 ${status.dot}`} />{statusLabel(deployment.status)}</span>
      <ArrowUpRight className="hidden h-4 w-4 text-white/30 transition-colors group-hover:text-violet-soft sm:block" />
    </Link>
  );
}
