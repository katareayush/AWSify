"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, ChevronDown, ChevronUp, Cloud, ExternalLink, GitPullRequest, HeartPulse, Loader2, Play, RotateCw, Save } from "lucide-react";
import { PageHeading } from "../../../components/page-heading";
import { InfraDiagram } from "../../../components/infra-diagram";
import { ProductShell } from "../../../components/product-shell";
import { Button } from "../../../components/ui/button";
import { Panel } from "../../../components/ui/panel";
import { EnvVarsPanel } from "../../../components/deployments/env-vars-panel";
import { FailurePanel } from "../../../components/deployments/failure-panel";
import { LogsPanel } from "../../../components/deployments/logs-panel";
import { PageSkeleton } from "../../../components/ui/skeleton";
import { useToast } from "../../../components/ui/toast";
import { useAuth } from "../../../lib/use-auth";
import { api, type CommitArtifactsResponse, type DeploymentDetail } from "../../../lib/api";

const POLLING_STATUSES = new Set(["queued", "scanning", "deploying"]);

function statusColor(s: string) {
  if (s === "deployed") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  if (s === "failed") return "border-red-500/30 bg-red-500/10 text-red-400";
  if (POLLING_STATUSES.has(s)) return "border-violet/30 bg-violet/10 text-violet-soft";
  return "border-white/[0.08] bg-white/[0.04] text-white/65";
}

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
  const [expandedArtifact, setExpandedArtifact] = useState<string | null>(null);
  const [runtimeValues, setRuntimeValues] = useState<{ port: string; healthPath: string }>({ port: "", healthPath: "/" });
  const [savingRuntime, setSavingRuntime] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rotatingToken, setRotatingToken] = useState(false);
  const [ciToken, setCiToken] = useState<{ token: string; secretName: string; variableName: string; projectId: string } | null>(null);
  const [committingArtifacts, setCommittingArtifacts] = useState(false);
  const [commitResult, setCommitResult] = useState<CommitArtifactsResponse | null>(null);
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

  useEffect(() => {
    const suggestion = detail?.plan?.suggestion as Record<string, unknown> | undefined;
    if (!suggestion) return;
    setRuntimeValues({
      port: String(suggestion.port ?? ""),
      healthPath: String(suggestion.healthPath ?? "/")
    });
  }, [detail?.plan?.id, detail?.plan?.updatedAt]);

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
  const suggestion = detail.plan?.suggestion as Record<string, unknown> | null;
  const envVars = Array.isArray(suggestion?.envVars)
    ? suggestion.envVars as Array<{ name: string; required?: boolean; description?: string }>
    : [];
  const savedEnvNames = new Set((detail.projectEnvVars ?? []).map((envVar) => envVar.name));
  const missingRequiredEnv = envVars.filter((envVar) => envVar.required !== false && !savedEnvNames.has(envVar.name));

  async function saveRuntimeSettings() {
    setSavingRuntime(true);
    setActionError(null);
    try {
      await api.saveDeploymentRuntime(id, {
        port: Number(runtimeValues.port),
        healthPath: runtimeValues.healthPath || "/"
      });
      await fetchDetail();
      toast.success("Runtime settings saved.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(msg);
      toast.error(msg);
    } finally {
      setSavingRuntime(false);
    }
  }

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

  async function rotateCiToken() {
    setRotatingToken(true);
    setActionError(null);
    try {
      setCiToken(await api.rotateDeploymentCiToken(id));
      toast.success("CI token rotated.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(msg);
      toast.error(msg);
    } finally {
      setRotatingToken(false);
    }
  }

  async function commitArtifacts() {
    setCommittingArtifacts(true);
    setActionError(null);
    try {
      const result = await api.commitDeploymentArtifacts(id);
      setCommitResult(result);
      toast.success(`Pushed to ${result.branch} (PR #${result.prNumber}).`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(msg);
      toast.error(msg);
    } finally {
      setCommittingArtifacts(false);
    }
  }

  return (
    <ProductShell active="Deployments">
      <div className="space-y-5">
        <PageHeading
          eyebrow={detail.project.repoFullName}
          title={detail.project.name}
          description={`Branch: ${detail.project.branch} - Created ${new Date(detail.createdAt).toLocaleDateString()}`}
          action={
            <span className={`rounded-full border px-3 py-1.5 text-[12px] font-medium ${statusColor(detail.status)}`}>
              {isRunning && <Loader2 className="inline h-3 w-3 animate-spin mr-1.5" />}
              {detail.status}
            </span>
          }
        />

        {isLive && detail.liveUrl && (
          <Panel className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <p className="text-[13px] text-white/70">Deployment is live at</p>
              <a
                href={detail.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[13px] text-violet-soft hover:underline"
              >
                {detail.liveUrl}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </Panel>
        )}

        {isFailed && detail.failureReason && (
          <FailurePanel reason={detail.failureReason} />
        )}

        {isAwaitingApproval && (
          <Panel className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-violet-soft" />
                  <p className="text-[14px] font-medium text-white">Plan is ready for review</p>
                </div>
                <p className="mt-2 max-w-2xl text-[13px] leading-[1.6] text-white/50">
                  AWS-ify has generated the bounded ECS Fargate plan. Add required env vars, review artifacts, then approve to create AWS resources.
                </p>
                {actionError && (
                  <p className="mt-3 font-mono text-[12px] text-red-400">{actionError}</p>
                )}
              </div>
              <Button
                onClick={approveDeployment}
                disabled={approving || missingRequiredEnv.length > 0}
              >
                {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Approve deploy
              </Button>
            </div>
          </Panel>
        )}

        <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
          <LogsPanel logs={detail.logs} isRunning={isRunning} />

          <div className="space-y-5">
            <Panel className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-[14px] font-medium tracking-tight text-white">Infrastructure path</p>
                <span className="font-mono text-[10.5px] uppercase tracking-wider text-white/35">ECS Fargate MVP</span>
              </div>
              <InfraDiagram />
            </Panel>

            <Panel className="p-5">
              <p className="text-[14px] font-medium tracking-tight text-white">Timeline</p>
              <div className="mt-4 space-y-3">
                {buildTimeline(detail.logs, detail.status).map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <span className={`mt-1 h-2.5 w-2.5 rounded-full ${item.state === "done" ? "bg-emerald-400" : item.state === "active" ? "bg-violet-soft" : item.state === "failed" ? "bg-red-400" : "bg-white/20"}`} />
                    <div>
                      <p className="text-[12.5px] font-medium text-white/75">{item.label}</p>
                      <p className="mt-0.5 text-[11.5px] text-white/35">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          {/* Plan summary */}
          <div className="space-y-4">
            {suggestion && (
              <Panel className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <HeartPulse className="h-4 w-4 text-violet-soft" />
                  <p className="text-[13px] font-medium text-white">Runtime check</p>
                </div>
                <div className="grid gap-3">
                  <label className="block">
                    <span className="mb-1 block text-[11px] text-white/40">Container port</span>
                    <input
                      value={runtimeValues.port}
                      onChange={(event) => setRuntimeValues((current) => ({ ...current, port: event.target.value }))}
                      inputMode="numeric"
                      disabled={!isAwaitingApproval}
                      className="h-9 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 font-mono text-[12px] text-white outline-none placeholder:text-white/25 focus:border-violet/40"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] text-white/40">Health path</span>
                    <input
                      value={runtimeValues.healthPath}
                      onChange={(event) => setRuntimeValues((current) => ({ ...current, healthPath: event.target.value }))}
                      placeholder="/"
                      disabled={!isAwaitingApproval}
                      className="h-9 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 font-mono text-[12px] text-white outline-none placeholder:text-white/25 focus:border-violet/40"
                    />
                  </label>
                </div>
                {isAwaitingApproval && (
                  <Button
                    className="mt-4 w-full"
                    variant="secondary"
                    onClick={saveRuntimeSettings}
                    disabled={savingRuntime || !runtimeValues.port || !runtimeValues.healthPath.startsWith("/")}
                  >
                    {savingRuntime ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save runtime
                  </Button>
                )}
              </Panel>
            )}

            <EnvVarsPanel
              deploymentId={id}
              detected={envVars}
              saved={detail.projectEnvVars ?? []}
              onChange={async () => { await fetchDetail(); }}
            />


            {detail.plan?.artifacts && detail.plan.artifacts.length > 0 && (
              <Panel className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <GitPullRequest className="h-4 w-4 text-violet-soft" />
                  <p className="text-[13px] font-medium text-white">Commit deploy files</p>
                </div>
                <p className="text-[12px] leading-[1.6] text-white/45">
                  {commitResult
                    ? <>Branch <span className="font-mono text-white/70">{commitResult.branch}</span> already exists with these files. Clicking again will update the same branch and PR &mdash; safe to re-run.</>
                    : <>Push the generated Dockerfile, workflow, and Pulumi files to a new branch and open a pull request against <span className="font-mono text-white/70">{detail.project.branch}</span>.</>}
                </p>
                <Button
                  className="mt-4 w-full"
                  variant="secondary"
                  onClick={commitArtifacts}
                  disabled={committingArtifacts}
                >
                  {committingArtifacts ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitPullRequest className="h-4 w-4" />}
                  {committingArtifacts
                    ? (commitResult ? "Updating branch…" : "Pushing…")
                    : (commitResult ? "Update branch" : "Open pull request")}
                </Button>
                {commitResult && (
                  <div className="mt-4 space-y-2 rounded-lg border border-white/[0.06] bg-black/35 p-3">
                    <Row label="Branch" value={commitResult.branch} />
                    <Row label="PR #" value={String(commitResult.prNumber)} />
                    <a
                      href={commitResult.prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[12px] text-violet-soft hover:underline"
                    >
                      View on GitHub
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <p className="text-[11px] leading-[1.55] text-white/35">
                      Committed: {commitResult.committed.join(", ")}
                    </p>
                  </div>
                )}
              </Panel>
            )}

            {detail.plan?.status === "approved" && (
              <Panel className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <RotateCw className="h-4 w-4 text-violet-soft" />
                  <p className="text-[13px] font-medium text-white">GitHub Actions redeploy</p>
                </div>
                <p className="text-[12px] leading-[1.6] text-white/45">
                  Generate a deploy token, add it as a GitHub secret named AWSIFY_API_TOKEN, and set AWSIFY_API_URL as a repository variable.
                </p>
                <Button
                  className="mt-4 w-full"
                  variant="secondary"
                  onClick={rotateCiToken}
                  disabled={rotatingToken}
                >
                  {rotatingToken ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
                  Generate token
                </Button>
                {ciToken && (
                  <div className="mt-4 space-y-2 rounded-lg border border-white/[0.06] bg-black/35 p-3">
                    <Row label="Secret" value={ciToken.secretName} />
                    <Row label="Variable" value={ciToken.variableName} />
                    <Row label="Project" value={ciToken.projectId} />
                    <p className="break-all font-mono text-[11px] leading-[1.6] text-amber-300/90">{ciToken.token}</p>
                    <p className="text-[11px] text-white/35">This token is shown once. Rotating it replaces the previous token.</p>
                  </div>
                )}
              </Panel>
            )}

            {suggestion && (
              <Panel className="p-5">
                <p className="text-[13px] font-medium text-white mb-3">Scan results</p>
                <dl className="space-y-2 text-[12.5px]">
                  {!!suggestion.appType && (
                    <Row label="App type" value={String(suggestion.appType)} />
                  )}
                  {!!suggestion.computeTarget && (
                    <Row label="Compute" value={String(suggestion.computeTarget)} />
                  )}
                  {!!suggestion.port && (
                    <Row label="Port" value={String(suggestion.port)} />
                  )}
                  {!!suggestion.healthPath && (
                    <Row label="Health path" value={String(suggestion.healthPath)} />
                  )}
                  {!!suggestion.packageManager && (
                    <Row label="Package manager" value={String(suggestion.packageManager)} />
                  )}
                  {!!suggestion.nodeVersion && (
                    <Row label="Node version" value={String(suggestion.nodeVersion)} />
                  )}
                </dl>
              </Panel>
            )}

            {detail.plan?.estimatedCost && (
              <Panel className="p-5">
                <p className="text-[13px] font-medium text-white mb-3">Cost estimate</p>
                <p className="font-mono text-[20px] font-medium text-white">
                  ${detail.plan.estimatedCost.low}-${detail.plan.estimatedCost.high}
                  <span className="ml-1 text-[13px] font-normal text-white/40">/mo</span>
                </p>
                {detail.plan.estimatedCost.notes.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {detail.plan.estimatedCost.notes.map((n, i) => (
                      <li key={i} className="text-[12px] text-white/45">- {n}</li>
                    ))}
                  </ul>
                )}
              </Panel>
            )}

            {detail.plan?.resources && detail.plan.resources.length > 0 && (
              <Panel className="p-5">
                <p className="text-[13px] font-medium text-white mb-3">
                  Resources
                  <span className="ml-2 font-mono text-[11px] text-white/35">{detail.plan.resources.length}</span>
                </p>
                <div className="space-y-2">
                  {detail.plan.resources.map((r, i) => (
                    <div key={i} className="text-[12.5px]">
                      <p className="font-mono text-white/70">{r.name}</p>
                      <p className="text-[11.5px] text-white/35">{r.type} - {r.purpose}</p>
                    </div>
                  ))}
                </div>
              </Panel>
            )}
          </div>
        </div>

        {/* Artifacts */}
        {detail.plan?.artifacts && detail.plan.artifacts.length > 0 && (
          <div className="space-y-3">
            <p className="text-[13px] font-medium text-white/60">Generated files</p>
            {detail.plan.artifacts.map(artifact => (
              <Panel key={artifact.kind} className="overflow-hidden">
                <button
                  onClick={() => setExpandedArtifact(expandedArtifact === artifact.kind ? null : artifact.kind)}
                  className="flex w-full items-center justify-between p-4 text-left"
                >
                  <div>
                    <p className="font-mono text-[13px] text-white">{artifact.path}</p>
                    <p className="mt-0.5 text-[12px] text-white/40">{artifact.summary}</p>
                  </div>
                  {expandedArtifact === artifact.kind
                    ? <ChevronUp className="h-4 w-4 shrink-0 text-white/40" />
                    : <ChevronDown className="h-4 w-4 shrink-0 text-white/40" />
                  }
                </button>
                {expandedArtifact === artifact.kind && (
                  <div className="border-t border-white/[0.06]">
                    <pre className="max-h-[400px] overflow-auto p-4 font-mono text-[12px] leading-[1.65] text-white/70">
                      <code>{artifact.content}</code>
                    </pre>
                  </div>
                )}
              </Panel>
            ))}
          </div>
        )}

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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-white/40">{label}</dt>
      <dd className="font-mono text-white/70 text-right">{value}</dd>
    </div>
  );
}

function buildTimeline(logs: DeploymentDetail["logs"], status: string) {
  const messages = logs.map((log) => log.message.toLowerCase());
  const has = (needle: string) => messages.some((message) => message.includes(needle));
  const failed = status === "failed";
  const deployed = status === "deployed";

  return [
    {
      label: "Queued",
      detail: "Deployment job created.",
      state: logs.length > 0 ? "done" : "pending"
    },
    {
      label: "Repository scan",
      detail: "Clone repo, detect runtime, env vars, port, and health path.",
      state: has("scan complete") || has("plan and preview") || deployed ? "done" : status === "scanning" ? "active" : "pending"
    },
    {
      label: "Approval",
      detail: "Review generated artifacts and approve infra changes.",
      state: status === "awaiting_approval" ? "active" : has("approved plan loaded") || deployed ? "done" : "pending"
    },
    {
      label: "Image build",
      detail: "Build Docker image and push it to ECR.",
      state: has("image pushed") || deployed ? "done" : status === "deploying" && has("creating ecr") ? "active" : "pending"
    },
    {
      label: "AWS apply",
      detail: "Run the approved Pulumi ECS Fargate template.",
      state: has("health check") || deployed ? "done" : status === "deploying" && has("running pulumi") ? "active" : "pending"
    },
    {
      label: "Health check",
      detail: "Poll the public ALB URL until the approved health path responds.",
      state: failed ? "failed" : deployed ? "done" : status === "deploying" && has("checking service health") ? "active" : "pending"
    }
  ];
}
