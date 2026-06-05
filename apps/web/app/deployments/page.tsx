"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, FileCode2 } from "lucide-react";
import { PageHeading } from "../../components/page-heading";
import { ProductShell } from "../../components/product-shell";
import { Button } from "../../components/ui/button";
import { Panel } from "../../components/ui/panel";
import { Pagination } from "../../components/ui/pagination";
import { PageSkeleton } from "../../components/ui/skeleton";
import { useAuth } from "../../lib/use-auth";
import { useToast } from "../../components/ui/toast";
import { api, type Deployment } from "../../lib/api";

const PAGE_SIZE = 10;

function statusColor(s: string) {
  if (s === "deployed") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  if (s === "failed") return "border-red-500/30 bg-red-500/10 text-red-400";
  if (s === "deploying" || s === "scanning") return "border-violet/30 bg-violet/10 text-violet-soft";
  return "border-white/[0.08] bg-white/[0.04] text-white/65";
}

export default function DeploymentsPage() {
  const { me, loading } = useAuth();
  const toast = useToast();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!me?.authenticated) return;
    api.listDeployments().then(r => setDeployments(r.deployments)).catch((err) => {
      toast.error(err instanceof Error ? err.message : "Could not load deployments.");
    });
  }, [me?.authenticated, toast]);

  const paginated = useMemo(
    () => deployments.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [deployments, page]
  );

  if (loading) {
    return (
      <ProductShell active="Templates">
        <PageSkeleton variant="list" />
      </ProductShell>
    );
  }

  return (
    <ProductShell active="Templates">
      <div className="space-y-5">
        <PageHeading
          eyebrow="Deployment plans"
          title="Generated plans"
          description="Each deployment generates a reviewed plan with Dockerfile, GitHub Actions, resources, and cost estimate."
        />

        <Panel className="p-5">
          {deployments.length === 0 ? (
            <div className="py-14 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
                <FileCode2 className="h-5 w-5 text-violet-soft" />
              </div>
              <p className="mt-5 text-[14px] font-medium text-white">No deployment plans yet</p>
              <p className="mx-auto mt-2 max-w-md text-[13px] leading-[1.6] text-white/55">
                Select a connected repository and deploy it. AWS-ify generates a plan before creating any AWS resources.
              </p>
              <Button asChild variant="secondary" className="mt-5">
                <Link href="/repositories">
                  Choose repository
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="divide-y divide-white/[0.05]">
                {paginated.map(d => (
                  <Link
                    key={d.id}
                    href={`/deployments/${d.id}`}
                    className="grid gap-3 py-4 text-[13.5px] transition-colors hover:bg-white/[0.02] sm:grid-cols-[1fr_180px_130px]"
                  >
                    <div>
                      <p className="font-medium text-white">{d.project.name}</p>
                      <p className="mt-1 font-mono text-[11px] text-white/45">{d.project.repoFullName} · {d.project.branch}</p>
                    </div>
                    <div>
                      {d.liveUrl ? (
                        <p className="truncate text-[12px] text-violet-soft">{d.liveUrl}</p>
                      ) : (
                        <p className="text-[12px] text-white/40">—</p>
                      )}
                      <p className="mt-1 font-mono text-[11px] text-white/45">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center sm:justify-end">
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] ${statusColor(d.status)}`}>
                        {d.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                total={deployments.length}
                onPageChange={setPage}
                label="deployments"
              />
            </>
          )}
        </Panel>
      </div>
    </ProductShell>
  );
}
