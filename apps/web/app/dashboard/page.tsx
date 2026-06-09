"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useUrlNumber } from "../../lib/use-url-state";
import { Activity, ArrowRight, CheckCircle2, Cloud, KeyRound, Rocket, TerminalSquare } from "lucide-react";
import { ProductShell } from "../../components/product-shell";
import { DeploymentRow } from "../../components/dashboard/deployment-row";
import { SetupBanner } from "../../components/dashboard/setup-banner";
import { StatStrip, type StatItem } from "../../components/dashboard/stat-strip";
import { Button } from "../../components/ui/button";
import { EmptyState } from "../../components/ui/empty-state";
import { Pagination } from "../../components/ui/pagination";
import { PageSkeleton } from "../../components/ui/skeleton";
import { useAuth } from "../../lib/use-auth";
import { useToast } from "../../components/ui/toast";
import { api, type AwsConnection, type Deployment, type PublicStatus } from "../../lib/api";

const PAGE_SIZE = 6;

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardPageInner />
    </Suspense>
  );
}

function DashboardPageInner() {
  const { me, loading } = useAuth();
  const toast = useToast();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [connections, setConnections] = useState<AwsConnection[]>([]);
  const [status, setStatus] = useState<PublicStatus | null>(null);
  const [page, setPage] = useUrlNumber("page", 0);

  useEffect(() => {
    if (!me?.authenticated) return;
    api.listDeployments().then((r) => setDeployments(r.deployments)).catch((err) => {
      toast.error(err instanceof Error ? err.message : "Could not load deployments.");
    });
    api.listConnections().then((r) => setConnections(r.connections)).catch((err) => {
      toast.error(err instanceof Error ? err.message : "Could not load AWS connections.");
    });
    api.publicStatus().then(setStatus).catch(() => setStatus(null));
  }, [me?.authenticated, toast]);

  const totalPages = Math.max(1, Math.ceil(deployments.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);

  useEffect(() => {
    if (page !== currentPage) setPage(currentPage);
  }, [currentPage, page, setPage]);

  const paginated = useMemo(
    () => deployments.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
    [deployments, currentPage]
  );

  if (loading) {
    return (
      <ProductShell active="Overview">
        <PageSkeleton />
      </ProductShell>
    );
  }

  const liveCount = deployments.filter((d) => d.status === "deployed").length;
  const pendingCount = deployments.filter((d) => ["queued", "scanning", "deploying"].includes(d.status)).length;
  const githubDone = Boolean(me?.authenticated);
  const awsDone = connections.length > 0;
  const canDeploy = githubDone && awsDone;

  const stats: StatItem[] = [
    { icon: Cloud, label: "Live", value: String(liveCount) },
    { icon: TerminalSquare, label: "In progress", value: String(pendingCount) },
    { icon: CheckCircle2, label: "Total", value: String(deployments.length) },
    { icon: KeyRound, label: "AWS accounts", value: String(connections.length) }
  ];

  return (
    <ProductShell active="Overview">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-[22px] font-medium tracking-tight text-white">Deployments</h1>
          <Button asChild>
            <Link href="/repositories">
              New deployment
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <SetupBanner githubDone={githubDone} awsDone={awsDone} />

        <StatStrip items={stats} />

        {status && (
          <div className="rounded-xl border border-white/[0.06] px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Activity className={`h-4 w-4 ${status.state === "operational" ? "text-emerald-400" : "text-amber-300"}`} />
                <div>
                  <p className="text-[13px] font-medium text-white">
                    {status.state === "operational" ? "Systems operational" : "Systems degraded"}
                  </p>
                  <p className="mt-1 text-[11.5px] text-white/40">
                    Worker {status.services.find((service) => service.name === "Deployment worker")?.state ?? "unknown"} · checked {new Date(status.checkedAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-right">
                <MiniMetric label="Active" value={status.recent.active} />
                <MiniMetric label="Failed" value={status.recent.failed} />
                <MiniMetric label="Failure" value={`${status.recent.failureRate}%`} />
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-white/[0.06]">
          <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-3">
            <p className="text-[13px] text-white/80">Recent deployments</p>
            {deployments.length > 0 && (
              <Link
                href="/deployments"
                className="text-[12px] text-white/45 transition-colors hover:text-white"
              >
                View all
              </Link>
            )}
          </div>

          {deployments.length === 0 ? (
            <EmptyState
              icon={Rocket}
              title="No deployments yet"
              description={canDeploy ? "Select a repository to create your first deployment." : "Connect AWS and install the GitHub App to deploy your first repository."}
              action={canDeploy ? (
                <Button asChild variant="secondary">
                  <Link href="/repositories">
                    Select repository
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : undefined}
            />
          ) : (
            <>
              <div className="divide-y divide-white/[0.04]">
                {paginated.map((d) => (
                  <DeploymentRow key={d.id} deployment={d} />
                ))}
              </div>
              <div className="px-5 pb-3">
                <Pagination
                  page={currentPage}
                  pageSize={PAGE_SIZE}
                  total={deployments.length}
                  onPageChange={setPage}
                  label="deployments"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </ProductShell>
  );
}

function MiniMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="font-mono text-[14px] text-white">{value}</p>
      <p className="text-[10.5px] text-white/35">{label}</p>
    </div>
  );
}
