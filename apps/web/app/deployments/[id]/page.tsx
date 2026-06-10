"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Cloud, DollarSign, FileCode2, LayoutGrid, Loader2, Play, Server, Settings, Settings2, TerminalSquare, Trash2 } from "lucide-react";
import { useUrlState } from "../../../lib/use-url-state";
import { ProductShell } from "../../../components/product-shell";
import { Button } from "../../../components/ui/button";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog";
import { Panel } from "../../../components/ui/panel";
import { PageSkeleton } from "../../../components/ui/skeleton";
import { useToast } from "../../../components/ui/toast";
import { useAuth } from "../../../lib/use-auth";
import { api, type DeploymentDetail } from "../../../lib/api";

import { ArtifactsList } from "../../../components/deployments/artifacts-list";
import { DeployActionsPanel } from "../../../components/deployments/deploy-actions-panel";
import { DeploymentHeader } from "../../../components/deployments/deployment-header";
import { DetailTabs, type DetailTab } from "../../../components/deployments/detail-tabs";
import { EnvVarsPanel } from "../../../components/deployments/env-vars-panel";
import { FailurePanel } from "../../../components/deployments/failure-panel";
import { InfrastructureGraph } from "../../../components/deployments/infrastructure-graph";
import { LogsPanel } from "../../../components/deployments/logs-panel";
import { PlanInfoPanel } from "../../../components/deployments/plan-info-panel";
import { SafetyReviewPanel } from "../../../components/deployments/safety-review-panel";
import { ScanReviewPanel } from "../../../components/deployments/scan-review-panel";
import { StageStrip } from "../../../components/deployments/stage-strip";
import { TimelinePanel } from "../../../components/deployments/timeline-panel";

const POLLING_STATUSES = new Set(["queued", "scanning", "deploying"]);

export default function DeploymentDetailPage() {
  return (
    <Suspense fallback={null}>
      <DeploymentDetailPageInner />
    </Suspense>
  );
}

function DeploymentDetailPageInner() {
  const { me, loading } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<DeploymentDetail | null>(null);
  const [fetching, setFetching] = useState(true);
  const [approving, setApproving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [tabRaw, setTabRaw] = useUrlState("tab", "overview");
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function fetchDetail() {
    try {
      const r = await api.getDeployment(id);
      setDetail(r.deployment);
      return r.deployment;
    } catch {
      return null;
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    if (!me?.authenticated) return;

    let cancelled = false;
    async function poll() {
      const d = await fetchDetail();
      if (cancelled) return;
      if (d && POLLING_STATUSES.has(d.status)) {
        pollRef.current = setTimeout(poll, 3500);
      }
    }
    poll();

    return () => {
      cancelled = true;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.authenticated, id]);

  if (loading || fetching) {
    return (
      <ProductShell active="Deployments">
        <PageSkeleton variant="detail" />
      </ProductShell>
    );
  }

  if (!detail) {
    return (
      <ProductShell active="Deployments">
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <Cloud className="h-8 w-8 text-white/20" />
          <div>
            <p className="text-[14px] font-medium text-white">Deployment not found</p>
            <p className="mt-1 text-[12.5px] text-white/45">It may have been deleted, or the link is wrong.</p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/deployments">Back to deployments</Link>
          </Button>
        </div>
      </ProductShell>
    );
  }

  const isLive = detail.status === "deployed";
  const isFailed = detail.status === "failed";
  const isRunning = POLLING_STATUSES.has(detail.status);
  const isAwaitingApproval = detail.status === "awaiting_approval";
  const isPlanReady = detail.plan?.status === "awaiting_approval";
  const isScanReviewReady = isAwaitingApproval && detail.plan?.status === "draft";
  const suggestion = (detail.plan?.suggestion as Record<string, unknown> | null) ?? null;
  const envVars = Array.isArray(suggestion?.envVars)
    ? (suggestion.envVars as Array<{ name: string; required?: boolean; description?: string; example?: string; category?: string }>)
    : [];
  const savedEnvNames = new Set((detail.projectEnvVars ?? []).map((envVar) => envVar.name));
  const missingRequiredEnv = envVars.filter((envVar) => envVar.required !== false && !savedEnvNames.has(envVar.name));

  async function approveDeployment() {
    setApproving(true);
    setActionError(null);
    try {
      await api.approveDeployment(id);
      await fetchDetail();
      toast.success("Plan approved — deployment starting.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(msg);
      toast.error(msg);
    } finally {
      setApproving(false);
    }
  }

  async function deleteDeployment() {
    setDeleting(true);
    try {
      await api.deleteDeployment(id);
      toast.success("Deployment deleted.");
      router.push("/deployments");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete deployment.");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const artifacts = detail.plan?.artifacts ?? [];
  const tabs: DetailTab[] = [
    { key: "overview", label: "Overview", icon: LayoutGrid, alert: isAwaitingApproval && isPlanReady },
    { key: "logs", label: "Logs", icon: TerminalSquare, badge: detail.logs.length, pulse: isRunning },
    { key: "config", label: "Configuration", icon: Settings2, alert: isScanReviewReady || missingRequiredEnv.length > 0 },
    ...(artifacts.length > 0 ? [{ key: "files", label: "Files", icon: FileCode2, badge: artifacts.length }] : [])
  ];
  const tab = tabs.some((t) => t.key === tabRaw) ? tabRaw : "overview";

  const headerChips = [];
  if (detail.plan?.region) {
    headerChips.push({ icon: <Server className="h-3 w-3" />, label: "Region", value: detail.plan.region, mono: true });
  }
  if (detail.plan?.estimatedCost) {
    headerChips.push({
      icon: <DollarSign className="h-3 w-3" />,
      label: "Est",
      value: `$${detail.plan.estimatedCost.low}–${detail.plan.estimatedCost.high}/mo`
    });
  }

  return (
    <ProductShell active="Deployments">
      <div className="space-y-6">
        <DeploymentHeader
          projectName={detail.project.name}
          repoFullName={detail.project.repoFullName}
          branch={detail.project.branch}
          createdAt={detail.createdAt}
          status={detail.status}
          isRunning={isRunning}
          liveUrl={isLive ? detail.liveUrl : null}
          chips={headerChips}
          action={
            <>
              {detail.projectId && (
                <Button asChild variant="secondary" size="icon" title="Project settings">
                  <Link href={`/projects/${detail.projectId}/settings`} aria-label="Project settings">
                    <Settings className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setConfirmDelete(true)}
                disabled={isRunning || deleting}
                title={isRunning ? "Wait for this deployment to finish before deleting it." : "Delete deployment"}
                aria-label="Delete deployment"
                className="border-red-500/20 bg-red-500/[0.04] text-red-200 hover:border-red-500/30 hover:bg-red-500/[0.08]"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </>
          }
          footer={<StageStrip status={detail.status} planStatus={detail.plan?.status ?? null} />}
        />

        {isFailed && detail.failureReason && (
          <FailurePanel deploymentId={id} reason={detail.failureReason} logs={detail.logs} />
        )}

        {isAwaitingApproval && isPlanReady && (
          <Panel className="border-amber-500/25 bg-amber-500/[0.04] p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-500/25 bg-amber-500/10">
                  <CheckCircle2 className="h-4 w-4 text-amber-300" />
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-white">Plan ready for review</p>
                  <p className="mt-1 text-[12.5px] leading-[1.55] text-white/55">
                    Review the safety summary below, add any required environment variables, then approve to create AWS resources.
                  </p>
                  {missingRequiredEnv.length > 0 && (
                    <p className="mt-1.5 text-[12px] text-amber-300/85">
                      {missingRequiredEnv.length} required variable{missingRequiredEnv.length === 1 ? "" : "s"} ({missingRequiredEnv.slice(0, 3).map((envVar) => envVar.name).join(", ")}{missingRequiredEnv.length > 3 ? "…" : ""}) {missingRequiredEnv.length === 1 ? "is" : "are"} still unset — the deploy may fail at runtime without them.
                    </p>
                  )}
                  {actionError && <p className="mt-2 font-mono text-[12px] text-red-400">{actionError}</p>}
                </div>
              </div>
              <Button
                onClick={approveDeployment}
                disabled={approving}
                className="shrink-0 self-start lg:self-center"
              >
                {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Approve deploy
              </Button>
            </div>
          </Panel>
        )}

        {isScanReviewReady && (
          <Panel className="border-violet/20 bg-violet/[0.035] p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-violet/25 bg-violet/10">
                <CheckCircle2 className="h-4 w-4 text-violet-soft" />
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-white">Scan ready for review</p>
                <p className="mt-1 text-[12.5px] leading-[1.55] text-white/55">
                  Confirm the detected framework, commands, port, health path, and variables in the panel on the right. AWSify will create the plan preview after you save this review.
                </p>
              </div>
            </div>
          </Panel>
        )}

        <DetailTabs tabs={tabs} active={tab} onChange={setTabRaw} />

        {tab === "overview" && (
          <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 space-y-5">
              {isAwaitingApproval && isPlanReady && (
                <SafetyReviewPanel
                  resources={detail.plan?.resources}
                  estimatedCost={detail.plan?.estimatedCost ?? null}
                  region={detail.plan?.region}
                />
              )}
              {!detail.plan && !isLive && !isFailed && (
                <Panel className="p-8">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <Cloud className="h-8 w-8 text-white/20" />
                    <p className="text-[13px] text-white/40">
                      {isRunning ? "Scanning the repository — the plan will appear here shortly." : "Plan will appear once the scan completes."}
                    </p>
                  </div>
                </Panel>
              )}
              <InfrastructureGraph
                resources={detail.plan?.resources}
                suggestion={suggestion}
              />
              <PlanInfoPanel
                suggestion={suggestion}
                resources={detail.plan?.resources}
                estimatedCost={detail.plan?.estimatedCost ?? null}
              />
            </div>

            <div className="min-w-0 space-y-4">
              <TimelinePanel logs={detail.logs} status={detail.status} />
            </div>
          </div>
        )}

        {tab === "logs" && <LogsPanel logs={detail.logs} isRunning={isRunning} />}

        {tab === "config" && (
          <div className="grid min-w-0 items-start gap-5 lg:grid-cols-2">
            <div className="min-w-0 space-y-4">
              {suggestion ? (
                <ScanReviewPanel
                  deploymentId={id}
                  suggestion={suggestion}
                  editable={isAwaitingApproval}
                  planReady={isPlanReady}
                  envVarCount={envVars.length}
                  planSignature={`${detail.plan?.id ?? ""}:${detail.plan?.updatedAt ?? ""}`}
                  onSaved={async () => { await fetchDetail(); }}
                />
              ) : (
                <Panel className="p-8">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <Settings2 className="h-7 w-7 text-white/20" />
                    <p className="text-[13px] text-white/40">Configuration appears once the repository scan completes.</p>
                  </div>
                </Panel>
              )}
            </div>
            <div className="min-w-0 space-y-4">
              {(isAwaitingApproval || envVars.length + (detail.projectEnvVars?.length ?? 0) > 0) && (
                <EnvVarsPanel
                  deploymentId={id}
                  detected={envVars}
                  saved={detail.projectEnvVars ?? []}
                  onChange={async () => { await fetchDetail(); }}
                />
              )}
              <DeployActionsPanel
                deploymentId={id}
                planStatus={detail.plan?.status}
                targetBranch={detail.project.branch}
                hasArtifacts={artifacts.length > 0}
              />
            </div>
          </div>
        )}

        {tab === "files" && <ArtifactsList artifacts={artifacts} />}

        <ConfirmDialog
          open={confirmDelete}
          title="Delete deployment?"
          description="This only removes the deployment record, logs, and timeline from AWSify. Any AWS resources, containers, load balancers, ECR images, or log groups already created will stay alive and may keep costing money. Remove them manually in AWS to stop charges."
          confirmLabel="Delete"
          tone="danger"
          onConfirm={deleteDeployment}
          onCancel={() => setConfirmDelete(false)}
        />
      </div>
    </ProductShell>
  );
}
