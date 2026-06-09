import Link from "next/link";
import type { Deployment } from "../../lib/api";

const statusStyles: Record<string, string> = {
  deployed: "text-emerald-300",
  failed: "text-red-300",
  deploying: "text-violet-soft",
  scanning: "text-violet-soft",
  queued: "text-white/55",
  awaiting_approval: "text-amber-300"
};

function statusClass(s: string) {
  return statusStyles[s] ?? "text-white/55";
}

export function DeploymentRow({ deployment }: { deployment: Deployment }) {
  return (
    <Link
      href={`/deployments/${deployment.id}`}
      className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.02] sm:items-center sm:gap-4"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] text-white">{deployment.project.name}</p>
        <p className="mt-0.5 truncate text-[11.5px] text-white/40">
          {deployment.project.repoFullName} · {deployment.project.branch}
        </p>
      </div>
      <span className="hidden text-[11.5px] text-white/40 sm:block">
        {new Date(deployment.updatedAt).toLocaleDateString()}
      </span>
      <span className={`shrink-0 rounded-full border border-white/[0.08] bg-white/[0.02] px-2 py-0.5 text-[11.5px] sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 ${statusClass(deployment.status)}`}>
        {deployment.status}
      </span>
    </Link>
  );
}
