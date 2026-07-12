"use client";

import Link from "next/link";
import { useState } from "react";
import { ExternalLink, Loader2, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { Panel } from "../ui/panel";
import { useToast } from "../ui/toast";
import { api, type ResourceGroup } from "../../lib/api";
import { relativeTime } from "../../lib/utils";
import { resourceServiceTag, resourceTypeLabel } from "./resource-type-meta";

const STATUS: Record<string, { dot: string; text: string; pulse?: boolean }> = {
  deployed: { dot: "bg-emerald-400", text: "text-emerald-300" },
  deploying: { dot: "bg-violet-soft", text: "text-violet-soft", pulse: true },
  destroying: { dot: "bg-amber-300", text: "text-amber-300", pulse: true },
  failed: { dot: "bg-red-400", text: "text-red-300" }
};

function statusLabel(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface Props {
  group: ResourceGroup;
  onTornDown: (deploymentId: string) => void;
}

export function ResourceGroupCard({ group, onTornDown }: Props) {
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [tearingDown, setTearingDown] = useState(false);

  const isRunning = group.status === "deploying" || group.status === "destroying";
  const status = STATUS[group.status] ?? { dot: "bg-white/40", text: "text-white/55" };

  async function tearDown() {
    setTearingDown(true);
    try {
      const result = await api.destroyDeploymentInfrastructure(group.deploymentId);
      if (result.status === "destroying" || result.status === "destroyed") {
        toast.success("Teardown queued — destroying these AWS resources.");
        onTornDown(group.deploymentId);
      } else {
        toast.error("Could not start teardown for this deployment.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not tear down resources.");
    } finally {
      setTearingDown(false);
      setConfirmOpen(false);
    }
  }

  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.04] px-5 py-4">
        <span className="relative flex h-2 w-2 shrink-0">
          {status.pulse && (
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-50 ${status.dot}`} />
          )}
          <span className={`relative inline-flex h-2 w-2 rounded-full ${status.dot}`} />
        </span>
        <div className="min-w-0 flex-1">
          <Link
            href={`/deployments/${group.deploymentId}`}
            className="truncate text-[13.5px] font-medium text-white transition-colors hover:text-violet-soft"
          >
            {group.projectName}
          </Link>
          <p className="mt-0.5 truncate font-mono text-[11px] text-white/40">
            {group.appName} · {group.region} · {relativeTime(group.createdAt)}
          </p>
        </div>
        {group.liveUrl && (
          <a
            href={group.liveUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-w-0 items-center gap-1.5 text-[12px] text-emerald-300/85 transition-colors hover:text-emerald-200 hover:underline"
          >
            <ExternalLink className="h-3 w-3 shrink-0" />
            <span className="min-w-0 truncate font-mono">{group.liveUrl.replace(/^https?:\/\//, "")}</span>
          </a>
        )}
        <span className={`shrink-0 text-[11.5px] font-medium ${status.text}`}>{statusLabel(group.status)}</span>
        <Button
          variant="secondary"
          onClick={() => setConfirmOpen(true)}
          disabled={tearingDown || isRunning}
          title={isRunning ? "This deployment is busy — wait for it to settle before tearing down." : "Tear down these AWS resources"}
          className="shrink-0 border-red-500/20 bg-red-500/[0.04] text-red-200/80 hover:border-red-500/35 hover:bg-red-500/[0.09] hover:text-red-100"
        >
          {tearingDown ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Tear down
        </Button>
      </div>

      <ul className="divide-y divide-white/[0.03]">
        {group.resources.map((resource, index) => (
          <li key={`${resource.type}-${resource.name}-${index}`} className="flex items-center gap-3 px-5 py-3">
            <span className="shrink-0 rounded-md border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-white/45">
              {resourceServiceTag(resource.type)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] text-white/85">{resourceTypeLabel(resource.type)}</p>
              <p className="truncate text-[11px] text-white/35">{resource.purpose}</p>
            </div>
            <span className="hidden max-w-[45%] shrink-0 truncate font-mono text-[11px] text-white/40 sm:block">
              {resource.name}
            </span>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={confirmOpen}
        title="Tear down these resources?"
        description="This destroys the Pulumi-managed AWS stack for this deployment — ECS service, load balancer, target groups, roles, log group, ECR repository — plus its env secret. Teardown runs in the background and can take a few minutes. The deployment record is kept for history."
        confirmLabel="Tear down"
        tone="danger"
        onConfirm={tearDown}
        onCancel={() => setConfirmOpen(false)}
      />
    </Panel>
  );
}
