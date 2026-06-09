"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ArrowRight, Settings } from "lucide-react";
import { ProductShell } from "../../components/product-shell";
import { EmptyState } from "../../components/ui/empty-state";
import { Panel } from "../../components/ui/panel";
import { PageSkeleton } from "../../components/ui/skeleton";
import { api, type Deployment } from "../../lib/api";
import { useToast } from "../../components/ui/toast";

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsPageInner />
    </Suspense>
  );
}

function SettingsPageInner() {
  const toast = useToast();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listDeployments()
      .then((result) => setDeployments(result.deployments))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Could not load projects."))
      .finally(() => setLoading(false));
  }, [toast]);

  const projects = useMemo(() => {
    const seen = new Set<string>();
    return deployments.filter((deployment) => {
      if (!deployment.projectId || seen.has(deployment.projectId)) return false;
      seen.add(deployment.projectId);
      return true;
    });
  }, [deployments]);

  if (loading) {
    return (
      <ProductShell active="Settings">
        <PageSkeleton variant="list" />
      </ProductShell>
    );
  }

  return (
    <ProductShell active="Settings">
      <div className="space-y-5">
        <div>
          <h1 className="text-[22px] font-medium tracking-tight text-white">Project settings</h1>
          <p className="mt-1 text-[13px] text-white/45">Safe controls for branch, runtime, env vars, artifacts, and CI tokens.</p>
        </div>

        <Panel className="overflow-hidden">
          {projects.length === 0 ? (
            <EmptyState icon={Settings} title="No projects yet" description="Create a deployment before editing project settings." />
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {projects.map((deployment) => (
                <Link
                  key={deployment.projectId}
                  href={`/projects/${deployment.projectId}/settings`}
                  className="grid gap-3 px-5 py-4 transition-colors hover:bg-white/[0.025] sm:grid-cols-[1fr_auto]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-white">{deployment.project.name}</p>
                    <p className="mt-1 truncate font-mono text-[11px] text-white/40">
                      {deployment.project.repoFullName} · {deployment.project.branch}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[12px] text-white/45">
                    Open
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </ProductShell>
  );
}
