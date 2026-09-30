"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useUrlNumber } from "../../lib/use-url-state";
import { ArrowRight, CheckCircle2, Cloud, KeyRound, Rocket, TerminalSquare } from "lucide-react";
import { ProductShell } from "../../components/product-shell";
import { ConnectionCard } from "../../components/dashboard/connection-card";
import { DashboardHero } from "../../components/dashboard/dashboard-hero";
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
  const pendingCount = deployments.filter((d) => ["queued", "scanning", "deploying", "destroying"].includes(d.status)).length;
  const failedCount = deployments.filter((d) => d.status === "failed").length;
  const finishedCount = liveCount + failedCount;
  const failureRate = finishedCount > 0 ? Math.round((failedCount / finishedCount) * 100) : 0;
  const validConnections = connections.filter((connection) => connection.status === "valid");
  const githubDone = Boolean(me?.authenticated);
  const awsDone = validConnections.length > 0;
  const canDeploy = githubDone && awsDone;

  const stats: StatItem[] = [
    { icon: Cloud, label: "Live", value: String(liveCount), tone: liveCount > 0 ? "emerald" : "neutral", hint: "Healthy and serving traffic" },
    { icon: TerminalSquare, label: "In progress", value: String(pendingCount), tone: pendingCount > 0 ? "violet" : "neutral", hint: "Scanning, deploying, or tearing down" },
    { icon: CheckCircle2, label: "Total", value: String(deployments.length), tone: "neutral", hint: "All deployments to date" },
    {
      icon: KeyRound,
      label: "Valid AWS",
      value: `${validConnections.length}/${connections.length}`,
      tone: awsDone ? "emerald" : "amber",
      hint: awsDone ? "Connections verified" : "Needs a valid IAM role"
    }
  ];

  return (
    <ProductShell active="Overview">
      <div className="space-y-7">
        <DashboardHero
          githubLogin={me?.githubLogin}
          liveCount={liveCount}
          pendingCount={pendingCount}
        />

        <SetupBanner githubDone={githubDone} awsDone={awsDone} />

        <StatStrip items={stats} />

        <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.75fr)_minmax(280px,0.85fr)]">
        <section className="min-w-0 border border-white/[0.14] bg-[#181916]">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.13em] text-white/45">Activity / latest</p>
              <h2 className="mt-1 text-[17px] font-semibold tracking-[-0.03em] text-white">Recent deployments</h2>
            </div>
            {deployments.length > 0 && (
              <Link
                href="/deployments"
                className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-white/55 transition-colors hover:text-white"
              >
                View all
                <ArrowRight className="h-3 w-3" />
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
              <div>
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
        </section>
        <ConnectionCard connections={connections} failureRate={failureRate} />
        </div>
      </div>
    </ProductShell>
  );
}
