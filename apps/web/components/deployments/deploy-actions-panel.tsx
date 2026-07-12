"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, FileDiff, GitPullRequest, Loader2, RotateCw, Rocket } from "lucide-react";
import { Button } from "../ui/button";
import { Panel } from "../ui/panel";
import { useToast } from "../ui/toast";
import { api, type ArtifactDiffFile, type CommitArtifactsResponse } from "../../lib/api";

interface DeployActionsPanelProps {
  deploymentId: string;
  planStatus?: string;
  targetBranch: string;
  hasArtifacts: boolean;
}

interface CiToken {
  token: string;
  wired?: boolean;
  wireError?: string;
  secretName: string;
  variables?: { name: string; value: string }[];
  variableName: string;
  variableValue: string;
  projectId: string;
}

export function DeployActionsPanel({ deploymentId, planStatus, targetBranch, hasArtifacts }: DeployActionsPanelProps) {
  const toast = useToast();
  const router = useRouter();
  const [commitResult, setCommitResult] = useState<CommitArtifactsResponse | null>(null);
  const [committing, setCommitting] = useState(false);
  const [ciToken, setCiToken] = useState<CiToken | null>(null);
  const [rotating, setRotating] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [redeploying, setRedeploying] = useState(false);
  const [diff, setDiff] = useState<{ files: ArtifactDiffFile[]; branch: string } | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);

  const showCommit = hasArtifacts;
  const showCi = planStatus === "approved";

  if (!showCommit && !showCi) return null;

  async function commitArtifacts() {
    setCommitting(true);
    try {
      const result = await api.commitDeploymentArtifacts(deploymentId);
      setCommitResult(result);
      toast.success(`Wired GitHub Actions on ${result.branch} and started a build.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not set up GitHub Actions.");
    } finally {
      setCommitting(false);
    }
  }

  async function loadDiff() {
    setDiffLoading(true);
    try {
      setDiff(await api.getDeploymentArtifactDiff(deploymentId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load artifact diff.");
    } finally {
      setDiffLoading(false);
    }
  }

  async function rotateCiToken() {
    setRotating(true);
    try {
      const result = await api.rotateDeploymentCiToken(deploymentId);
      setCiToken(result);
      toast.success(result.wired ? "Token rotated and repo secret updated." : "CI token rotated — paste it into the repo.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not rotate token.");
    } finally {
      setRotating(false);
    }
  }

  async function redeployLatest() {
    setRedeploying(true);
    try {
      const result = await api.redeployLatest(deploymentId);
      toast.success(`Redeploy queued for ${targetBranch}.`);
      router.push(`/deployments/${result.deploymentId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not redeploy latest commit.");
    } finally {
      setRedeploying(false);
    }
  }

  async function copyToken() {
    if (!ciToken) return;
    try {
      await navigator.clipboard.writeText(ciToken.token);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-white/[0.05] px-5 py-3">
        <Rocket className="h-4 w-4 text-violet-soft" />
        <p className="text-[13px] font-medium text-white">Deploy actions</p>
      </div>

      {showCommit && (
        <section className="px-5 py-4">
          <div className="flex items-center gap-2">
            <GitPullRequest className="h-3.5 w-3.5 text-white/55" />
            <p className="text-[12.5px] font-medium text-white/85">Set up GitHub Actions deploys</p>
          </div>
          <p className="mt-1.5 text-[11.5px] leading-[1.55] text-white/45">
            {commitResult
              ? <>Workflow synced to <span className="font-mono text-white/65">{commitResult.branch}</span> and a build was {commitResult.triggered === "push" ? "pushed" : "dispatched"} — safe to re-run.</>
              : <>Commit the deploy workflow to <span className="font-mono text-white/65">{targetBranch}</span> and wire the repo secret + variables, so every push builds in your repo and deploys itself.</>}
          </p>
          <Button
            className="mt-3 w-full"
            variant="secondary"
            onClick={loadDiff}
            disabled={diffLoading}
          >
            {diffLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDiff className="h-4 w-4" />}
            {diff ? "Refresh diff" : "Preview diff"}
          </Button>
          {diff && (
            <div className="mt-3 space-y-3 rounded-md border border-white/[0.06] bg-black/25 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11.5px] text-white/50">
                  Compared with <span className="font-mono text-white/70">{diff.branch}</span>
                </p>
                <p className="font-mono text-[10.5px] text-white/35">{diff.files.length} files</p>
              </div>
              {diff.files.map((file) => (
                <DiffPreview key={file.path} file={file} />
              ))}
            </div>
          )}
          <Button
            className="mt-3 w-full"
            variant="secondary"
            onClick={commitArtifacts}
            disabled={committing}
          >
            {committing ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitPullRequest className="h-4 w-4" />}
            {committing
              ? (commitResult ? "Re-syncing…" : "Wiring…")
              : (commitResult ? "Re-sync workflow" : "Wire CI & push workflow")}
          </Button>
          {commitResult && (
            <div className="mt-3 space-y-1.5 rounded-md border border-white/[0.06] bg-black/30 px-3 py-2.5">
              <MiniRow label="Branch" value={commitResult.branch} />
              <MiniRow label="Committed" value={commitResult.committed.length ? commitResult.committed.join(", ") : "already current"} />
              <MiniRow label="Wired" value={commitResult.wired.join(", ")} />
              <MiniRow label="Build" value={commitResult.triggered === "push" ? "started via push" : "dispatched"} />
            </div>
          )}
        </section>
      )}

      {showCommit && showCi && <div className="border-t border-white/[0.05]" />}

      {showCi && (
        <section className="px-5 py-4">
          <div className="mb-4 rounded-md border border-white/[0.06] bg-white/[0.015] p-3">
            <div className="flex items-center gap-2">
              <Rocket className="h-3.5 w-3.5 text-white/55" />
              <p className="text-[12.5px] font-medium text-white/85">Redeploy latest commit</p>
            </div>
            <p className="mt-1.5 text-[11.5px] leading-[1.55] text-white/45">
              Pull the latest commit on <span className="font-mono text-white/65">{targetBranch}</span> and reuse the approved plan.
            </p>
            <Button
              className="mt-3 w-full"
              variant="secondary"
              onClick={redeployLatest}
              disabled={redeploying}
            >
              {redeploying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              {redeploying ? "Queueing…" : "Redeploy latest commit"}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <RotateCw className="h-3.5 w-3.5 text-white/55" />
            <p className="text-[12.5px] font-medium text-white/85">CI redeploy token</p>
          </div>
          <p className="mt-1.5 text-[11.5px] leading-[1.55] text-white/45">
            AWS-ify set the repo secret <span className="font-mono text-white/65">AWSIFY_API_TOKEN</span> and variables <span className="font-mono text-white/65">AWSIFY_API_URL</span> / <span className="font-mono text-white/65">AWSIFY_DEPLOY_ROLE_ARN</span> automatically. Rotate to issue a new token and re-push it to the repo.
          </p>
          <Button
            className="mt-3 w-full"
            variant="secondary"
            onClick={rotateCiToken}
            disabled={rotating}
          >
            {rotating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
            {ciToken ? "Rotate token" : "Rotate token"}
          </Button>
          {ciToken && (
            <div className="mt-3 space-y-2 rounded-md border border-amber-500/15 bg-amber-500/[0.04] px-3 py-2.5">
              <p className="text-[11px] leading-[1.55] text-amber-200/90">
                {ciToken.wired
                  ? "Rotated and pushed to the repo — nothing to paste."
                  : "Rotated. Couldn't update the repo automatically, so paste this token into the AWSIFY_API_TOKEN secret:"}
              </p>
              {!ciToken.wired && (
                <div className="flex items-start justify-between gap-2">
                  <p className="break-all font-mono text-[11px] leading-[1.55] text-amber-200/90">{ciToken.token}</p>
                  <button
                    type="button"
                    onClick={copyToken}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-white/55 transition-colors hover:bg-white/[0.05] hover:text-white"
                    aria-label="Copy token"
                  >
                    {tokenCopied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              )}
              <div className="space-y-1 border-t border-amber-500/10 pt-2">
                <MiniRow label="Secret" value={ciToken.secretName} />
                {(ciToken.variables ?? [{ name: ciToken.variableName, value: ciToken.variableValue }]).map((variable) => (
                  <MiniRow
                    key={variable.name}
                    label={variable.name}
                    value={variable.value || "(not configured)"}
                  />
                ))}
              </div>
              {ciToken.wireError && <p className="text-[10.5px] text-amber-300/70">{ciToken.wireError}</p>}
            </div>
          )}
        </section>
      )}
    </Panel>
  );
}

function MiniRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 text-[11.5px]">
      <span className="shrink-0 text-white/40">{label}</span>
      <span className="min-w-0 truncate font-mono text-white/70" title={value}>{value}</span>
    </div>
  );
}

function DiffPreview({ file }: { file: ArtifactDiffFile }) {
  return (
    <div className="overflow-hidden rounded border border-white/[0.06]">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.05] bg-white/[0.025] px-2.5 py-2">
        <span className="min-w-0 truncate font-mono text-[11px] text-white/75" title={file.path}>{file.path}</span>
        <span className="shrink-0 font-mono text-[10.5px] text-white/45">
          {file.status} · <span className="text-emerald-300">+{file.additions}</span> <span className="text-red-300">-{file.deletions}</span>
        </span>
      </div>
      <div className="max-h-44 overflow-auto bg-black/25">
        {file.hunks.length === 0 ? (
          <p className="px-2.5 py-2 text-[11px] text-white/35">No content changes.</p>
        ) : file.hunks.slice(0, 80).map((hunk, index) => (
          <pre
            key={`${index}-${hunk.type}-${hunk.lineNumber ?? ""}`}
            className={`px-2.5 py-0.5 font-mono text-[10.5px] leading-[1.45] ${hunk.type === "add" ? "bg-emerald-500/10 text-emerald-200/80" : hunk.type === "remove" ? "bg-red-500/10 text-red-200/80" : "text-white/35"}`}
          >
            {hunk.type === "add" ? "+" : hunk.type === "remove" ? "-" : " "} {hunk.content || " "}
          </pre>
        ))}
      </div>
    </div>
  );
}
