"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, GitPullRequest, Loader2, RotateCw, Rocket } from "lucide-react";
import { Button } from "../ui/button";
import { Panel } from "../ui/panel";
import { useToast } from "../ui/toast";
import { api, type CommitArtifactsResponse } from "../../lib/api";

interface DeployActionsPanelProps {
  deploymentId: string;
  planStatus?: string;
  targetBranch: string;
  hasArtifacts: boolean;
}

interface CiToken {
  token: string;
  secretName: string;
  variableName: string;
  projectId: string;
}

export function DeployActionsPanel({ deploymentId, planStatus, targetBranch, hasArtifacts }: DeployActionsPanelProps) {
  const toast = useToast();
  const [commitResult, setCommitResult] = useState<CommitArtifactsResponse | null>(null);
  const [committing, setCommitting] = useState(false);
  const [ciToken, setCiToken] = useState<CiToken | null>(null);
  const [rotating, setRotating] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);

  const showCommit = hasArtifacts;
  const showCi = planStatus === "approved";

  if (!showCommit && !showCi) return null;

  async function commitArtifacts() {
    setCommitting(true);
    try {
      const result = await api.commitDeploymentArtifacts(deploymentId);
      setCommitResult(result);
      toast.success(`Pushed to ${result.branch} (PR #${result.prNumber}).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not commit artifacts.");
    } finally {
      setCommitting(false);
    }
  }

  async function rotateCiToken() {
    setRotating(true);
    try {
      setCiToken(await api.rotateDeploymentCiToken(deploymentId));
      toast.success("CI token rotated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not rotate token.");
    } finally {
      setRotating(false);
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
            <p className="text-[12.5px] font-medium text-white/85">Commit deploy files</p>
          </div>
          <p className="mt-1.5 text-[11.5px] leading-[1.55] text-white/45">
            {commitResult
              ? <>Updates branch <span className="font-mono text-white/65">{commitResult.branch}</span> — safe to re-run.</>
              : <>Push Dockerfile, workflow, and Pulumi files; open a PR against <span className="font-mono text-white/65">{targetBranch}</span>.</>}
          </p>
          <Button
            className="mt-3 w-full"
            variant="secondary"
            onClick={commitArtifacts}
            disabled={committing}
          >
            {committing ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitPullRequest className="h-4 w-4" />}
            {committing
              ? (commitResult ? "Updating…" : "Pushing…")
              : (commitResult ? "Update branch" : "Open pull request")}
          </Button>
          {commitResult && (
            <div className="mt-3 space-y-1.5 rounded-md border border-white/[0.06] bg-black/30 px-3 py-2.5">
              <MiniRow label="Branch" value={commitResult.branch} />
              <MiniRow label="PR" value={`#${commitResult.prNumber}`} />
              <a
                href={commitResult.prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[11.5px] text-violet-soft hover:underline"
              >
                View on GitHub
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </section>
      )}

      {showCommit && showCi && <div className="border-t border-white/[0.05]" />}

      {showCi && (
        <section className="px-5 py-4">
          <div className="flex items-center gap-2">
            <RotateCw className="h-3.5 w-3.5 text-white/55" />
            <p className="text-[12.5px] font-medium text-white/85">CI redeploy token</p>
          </div>
          <p className="mt-1.5 text-[11.5px] leading-[1.55] text-white/45">
            Generate a deploy token. Add it as repo secret <span className="font-mono text-white/65">AWSIFY_API_TOKEN</span> and variable <span className="font-mono text-white/65">AWSIFY_API_URL</span>.
          </p>
          <Button
            className="mt-3 w-full"
            variant="secondary"
            onClick={rotateCiToken}
            disabled={rotating}
          >
            {rotating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
            {ciToken ? "Rotate token" : "Generate token"}
          </Button>
          {ciToken && (
            <div className="mt-3 space-y-2 rounded-md border border-amber-500/15 bg-amber-500/[0.04] px-3 py-2.5">
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
              <div className="space-y-1 border-t border-amber-500/10 pt-2">
                <MiniRow label="Secret" value={ciToken.secretName} />
                <MiniRow label="Variable" value={ciToken.variableName} />
              </div>
              <p className="text-[10.5px] text-white/40">Shown once. Rotating replaces the previous token.</p>
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
