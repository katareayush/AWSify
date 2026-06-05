"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useUrlNumber } from "../../lib/use-url-state";
import { ArrowRight, CheckCircle2, Cloud, KeyRound, Rocket, TerminalSquare } from "lucide-react";
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
import { api, type Deployment, type AwsConnection } from "../../lib/api";

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
  const [page, setPage] = useUrlNumber("page", 0);

  useEffect(() => {
    if (!me?.authenticated) return;
    api.listDeployments().then((r) => setDeployments(r.deployments)).catch((err) => {
      toast.error(err instanceof Error ? err.message : "Could not load deployments.");
    });
    api.listConnections().then((r) => setConnections(r.connections)).catch((err) => {
      toast.error(err instanceof Error ? err.message : "Could not load AWS connections.");
    });
  }, [me?.authenticated, toast]);

  const paginated = useMemo(
    () => deployments.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [deployments, page]
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
                  page={page}
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

