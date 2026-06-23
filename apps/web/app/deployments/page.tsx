"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useUrlNumber } from "../../lib/use-url-state";
import { ArrowRight, ExternalLink, FileCode2, Loader2, Trash2 } from "lucide-react";
import { PageHeading } from "../../components/page-heading";
import { ProductShell } from "../../components/product-shell";
import { Button } from "../../components/ui/button";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Panel } from "../../components/ui/panel";
import { Pagination } from "../../components/ui/pagination";
import { PageSkeleton } from "../../components/ui/skeleton";
import { EmptyState } from "../../components/ui/empty-state";
import { useAuth } from "../../lib/use-auth";
import { useToast } from "../../components/ui/toast";
import { api, type Deployment } from "../../lib/api";
import { relativeTime } from "../../lib/utils";

const PAGE_SIZE = 10;

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

export default function DeploymentsPage() {
  return (
    <Suspense fallback={null}>
      <DeploymentsPageInner />
    </Suspense>
  );
}

function DeploymentsPageInner() {
  const { me, loading } = useAuth();
  const toast = useToast();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<Deployment | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useUrlNumber("page", 0);

  useEffect(() => {
    if (loading) return;
    if (!me?.authenticated) {
      setDataLoading(false);
      return;
    }
    api.listDeployments()
      .then(r => setDeployments(r.deployments))
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Could not load deployments.");
      })
      .finally(() => setDataLoading(false));
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

  async function deleteDeployment(deployment: Deployment) {
    setDeletingId(deployment.id);
    try {
      await api.deleteDeployment(deployment.id);
      setDeployments((current) => current.filter((item) => item.id !== deployment.id));
      toast.success("Deployment deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete deployment.");
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  }

  if (loading || dataLoading) {
    return (
      <ProductShell active="Deployments">
        <PageSkeleton variant="list" />
      </ProductShell>
    );
  }

  return (
    <ProductShell active="Deployments">
      <div className="space-y-5">
        <PageHeading
          eyebrow="Deployments"
          title="All deployments"
          description="Every deployment generates a reviewed plan with Dockerfile, GitHub Actions, resources, and cost estimate before anything is created in AWS."
          action={
            <Button asChild>
              <Link href="/repositories">
                New deployment
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          }
        />

        <Panel className="overflow-hidden">
          {deployments.length === 0 ? (
            <EmptyState
              icon={FileCode2}
              title="No deployments yet"
              description="Select a connected repository and deploy it. AWSify generates a plan before creating any AWS resources."
              action={
                <Button asChild variant="secondary">
                  <Link href="/repositories">
                    Choose repository
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              }
            />
          ) : (
            <>
              <div className="divide-y divide-white/[0.04]">
                {paginated.map(d => {
                  const isRunning = ["queued", "scanning", "deploying", "destroying"].includes(d.status);
                  const isDeleting = deletingId === d.id;
                  const status = STATUS[d.status] ?? { dot: "bg-white/40", text: "text-white/55" };
                  return (
                    <div
                      key={d.id}
                      className="group relative flex items-center gap-3 px-5 py-4 transition-colors hover:bg-white/[0.02] sm:gap-4"
                    >
                      <Link
                        href={`/deployments/${d.id}`}
                        className="absolute inset-0"
                        aria-label={`Open deployment ${d.project.name}`}
                      />
                      <span className="relative flex h-2 w-2 shrink-0">
                        {status.pulse && (
                          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-50 ${status.dot}`} />
                        )}
                        <span className={`relative inline-flex h-2 w-2 rounded-full ${status.dot}`} />
                      </span>
                      <div className="pointer-events-none min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium text-white">{d.project.name}</p>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-white/40">
                          {d.project.repoFullName} · {d.project.branch}
                        </p>
                      </div>
                      <div className="pointer-events-none hidden min-w-0 max-w-[260px] flex-1 md:block">
                        {d.liveUrl ? (
                          <p className="flex min-w-0 items-center gap-1.5 text-[12px] text-emerald-300/85">
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            <span className="min-w-0 truncate font-mono">{d.liveUrl.replace(/^https?:\/\//, "")}</span>
                          </p>
                        ) : (
                          <p className="text-[12px] text-white/30">—</p>
                        )}
                      </div>
                      <span className="pointer-events-none hidden shrink-0 text-[11.5px] text-white/35 sm:block">
                        {relativeTime(d.createdAt)}
                      </span>
                      <span className={`pointer-events-none shrink-0 text-[11.5px] font-medium ${status.text}`}>
                        {statusLabel(d.status)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(d)}
                        disabled={isRunning || isDeleting}
                        title={isRunning ? "Wait for this deployment to finish before deleting it." : "Delete deployment"}
                        className="relative z-10 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-500/15 bg-red-500/[0.03] text-red-200/70 transition-colors hover:border-red-500/30 hover:bg-red-500/[0.08] hover:text-red-100 disabled:pointer-events-none disabled:opacity-45"
                        aria-label={`Delete deployment ${d.project.name}`}
                      >
                        {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="px-5 pb-4">
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
        </Panel>
        <ConfirmDialog
          open={confirmDelete !== null}
          title="Delete deployment?"
          description="This only removes the deployment record, logs, and timeline from AWSify. Any AWS resources, containers, load balancers, ECR images, or log groups already created will stay alive and may keep costing money. Remove them manually in AWS to stop charges."
          confirmLabel="Delete"
          tone="danger"
          onConfirm={() => (confirmDelete ? deleteDeployment(confirmDelete) : Promise.resolve())}
          onCancel={() => setConfirmDelete(null)}
        />
      </div>
    </ProductShell>
  );
}
