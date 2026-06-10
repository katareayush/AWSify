"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useUrlNumber } from "../../lib/use-url-state";
import { AlertTriangle, ArrowRight, CheckCircle2, Cloud, KeyRound, Rocket, TerminalSquare } from "lucide-react";
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
import { api, type AwsConnection, type Deployment } from "../../lib/api";

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
  const [dataLoading, setDataLoading] = useState(true);
  const [page, setPage] = useUrlNumber("page", 0);

  useEffect(() => {
    if (loading) return;
    if (!me?.authenticated) {
      setDataLoading(false);
      return;
    }
    let cancelled = false;
    setDataLoading(true);
    Promise.all([
      api.listDeployments().then((r) => r.deployments).catch((err) => {
        toast.error(err instanceof Error ? err.message : "Could not load deployments.");
        return [] as Deployment[];
      }),
      api.listConnections().then((r) => r.connections).catch((err) => {
        toast.error(err instanceof Error ? err.message : "Could not load AWS connections.");
        return [] as AwsConnection[];
      }),
    ]).then(([deps, conns]) => {
      if (cancelled) return;
      setDeployments(deps);
      setConnections(conns);
      setDataLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [loading, me?.authenticated, toast]);

  const totalPages = Math.max(1, Math.ceil(deployments.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);

  useEffect(() => {
    if (page !== currentPage) setPage(currentPage);
  }, [currentPage, page, setPage]);

  const paginated = useMemo(
    () => deployments.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
    [deployments, currentPage]
  );

  if (loading || dataLoading) {
    return (
      <ProductShell active="Overview">
        <PageSkeleton />
      </ProductShell>
    );
  }

  const liveCount = deployments.filter((d) => d.status === "deployed").length;
  const pendingCount = deployments.filter((d) => ["queued", "scanning", "deploying"].includes(d.status)).length;
  const failedCount = deployments.filter((d) => d.status === "failed").length;
  const finishedCount = liveCount + failedCount;
  const failureRate = finishedCount > 0 ? Math.round((failedCount / finishedCount) * 100) : 0;
  const validConnections = connections.filter((connection) => connection.status === "valid");
  const invalidConnections = connections.filter((connection) => connection.status === "invalid");
  const pendingConnections = connections.filter((connection) => connection.status === "pending");
  const githubDone = Boolean(me?.authenticated);
  const awsDone = validConnections.length > 0;
  const canDeploy = githubDone && awsDone;
  const primaryConnection = validConnections[0] ?? connections[0] ?? null;
  const awsState = validConnections.length > 0
    ? "ready"
    : connections.length > 0
      ? "attention"
      : "missing";

  const stats: StatItem[] = [
    { icon: Cloud, label: "Live", value: String(liveCount) },
    { icon: TerminalSquare, label: "In progress", value: String(pendingCount) },
    { icon: CheckCircle2, label: "Total", value: String(deployments.length) },
    { icon: KeyRound, label: "Valid AWS", value: `${validConnections.length}/${connections.length}` }
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

        <div className="rounded-xl border border-white/[0.06] px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {awsState === "ready" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-300" />
              )}
              <div>
                <p className="text-[13px] font-medium text-white">
                  {awsState === "ready"
                    ? "AWS connection ready"
                    : awsState === "attention"
                      ? "AWS connection needs attention"
                      : "AWS connection missing"}
                </p>
                <p className="mt-1 text-[11.5px] text-white/40">
                  {primaryConnection
                    ? `${primaryConnection.accountId} · ${primaryConnection.defaultRegion} · ${primaryConnection.status}`
                    : "Connect a valid IAM role before starting deployments."}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="grid grid-cols-3 gap-2 text-right">
                <MiniMetric label="Invalid" value={invalidConnections.length} />
                <MiniMetric label="Pending" value={pendingConnections.length} />
                <MiniMetric label="Failure" value={`${failureRate}%`} />
              </div>
              {awsState !== "ready" && (
                <Button asChild variant="secondary">
                  <Link href="/connections">
                    Fix AWS
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

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
