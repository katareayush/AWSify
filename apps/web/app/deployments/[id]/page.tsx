"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Cloud, DollarSign, Loader2, Play, Server } from "lucide-react";
import { ProductShell } from "../../../components/product-shell";
import { Button } from "../../../components/ui/button";
import { Panel } from "../../../components/ui/panel";
import { PageSkeleton } from "../../../components/ui/skeleton";
import { useToast } from "../../../components/ui/toast";
import { useAuth } from "../../../lib/use-auth";
import { api, type DeploymentDetail } from "../../../lib/api";

import { ArtifactsList } from "../../../components/deployments/artifacts-list";
import { DeployActionsPanel } from "../../../components/deployments/deploy-actions-panel";
import { DeploymentHeader } from "../../../components/deployments/deployment-header";
import { EnvVarsPanel } from "../../../components/deployments/env-vars-panel";
import { FailurePanel } from "../../../components/deployments/failure-panel";
import { LogsPanel } from "../../../components/deployments/logs-panel";
import { PlanInfoPanel } from "../../../components/deployments/plan-info-panel";
import { RuntimePanel } from "../../../components/deployments/runtime-panel";
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
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<DeploymentDetail | null>(null);
  const [fetching, setFetching] = useState(true);
  const [approving, setApproving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
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
        <div className="py-24 text-center">
          <p className="text-[14px] font-medium text-white">Deployment not found</p>
        </div>
      </ProductShell>
    );
  }

  const isLive = detail.status === "deployed";
  const isFailed = detail.status === "failed";
  const isRunning = POLLING_STATUSES.has(detail.status);
  const isAwaitingApproval = detail.status === "awaiting_approval";
  const suggestion = (detail.plan?.suggestion as Record<string, unknown> | null) ?? null;
  const envVars = Array.isArray(suggestion?.envVars)
    ? (suggestion.envVars as Array<{ name: string; required?: boolean; description?: string }>)
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
        />

        {isFailed && detail.failureReason && <FailurePanel reason={detail.failureReason} />}

        {isAwaitingApproval && (
          <Panel className="border-amber-500/20 bg-amber-500/[0.03] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-300" />
                  <p className="text-[14px] font-medium text-white">Plan ready for review</p>
                </div>
                <p className="mt-2 max-w-2xl text-[13px] leading-[1.6] text-white/55">
                  Review the plan, add any required environment variables, then approve to create AWS resources.
                </p>
                {missingRequiredEnv.length > 0 && (
                  <p className="mt-2 text-[12px] text-amber-300/85">
                    {missingRequiredEnv.length} required env var{missingRequiredEnv.length === 1 ? "" : "s"} missing — add them below before approving.
                  </p>
                )}
                {actionError && <p className="mt-3 font-mono text-[12px] text-red-400">{actionError}</p>}
              </div>
              <Button
                onClick={approveDeployment}
                disabled={approving || missingRequiredEnv.length > 0}
                className="shrink-0"
              >
                {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Approve deploy
              </Button>
            </div>
          </Panel>
        )}

        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-5">
            <LogsPanel logs={detail.logs} isRunning={isRunning} />
            {detail.plan?.artifacts && <ArtifactsList artifacts={detail.plan.artifacts} />}
          </div>

          <div className="min-w-0 space-y-4">
            <TimelinePanel logs={detail.logs} status={detail.status} />

            {envVars.length + (detail.projectEnvVars?.length ?? 0) > 0 && (
              <EnvVarsPanel
                deploymentId={id}
                detected={envVars}
                saved={detail.projectEnvVars ?? []}
                onChange={async () => { await fetchDetail(); }}
              />
            )}

            {suggestion && (
              <RuntimePanel
                deploymentId={id}
                initialPort={String(suggestion.port ?? "")}
                initialHealthPath={String(suggestion.healthPath ?? "/")}
                editable={isAwaitingApproval}
                planSignature={`${detail.plan?.id ?? ""}:${detail.plan?.updatedAt ?? ""}`}
                onSaved={async () => { await fetchDetail(); }}
              />
            )}

            <PlanInfoPanel
              suggestion={suggestion}
              resources={detail.plan?.resources}
              estimatedCost={detail.plan?.estimatedCost ?? null}
            />

            <DeployActionsPanel
              deploymentId={id}
              planStatus={detail.plan?.status}
              targetBranch={detail.project.branch}
              hasArtifacts={!!detail.plan?.artifacts && detail.plan.artifacts.length > 0}
            />
          </div>
        </div>

        {!detail.plan && !isLive && !isFailed && (
          <Panel className="p-10">
            <div className="flex flex-col items-center gap-3 text-center">
              <Cloud className="h-8 w-8 text-white/20" />
              <p className="text-[13px] text-white/40">Plan will appear once the scan completes</p>
            </div>
          </Panel>
        )}
      </div>
    </ProductShell>
  );
}
