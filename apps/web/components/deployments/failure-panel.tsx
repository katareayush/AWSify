"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Copy, Loader2, RotateCw, ServerCrash, Wrench } from "lucide-react";
import { Panel } from "../ui/panel";
import { useToast } from "../ui/toast";
import { api, type DeploymentDiagnosis } from "../../lib/api";

const COLLAPSED_HEIGHT = 160;

export function FailurePanel({
  deploymentId,
  reason,
  logs
}: {
  deploymentId: string;
  reason: string;
  logs: Array<{ status: string; message: string; at: string }>;
}) {
  const toast = useToast();
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [diagnosis, setDiagnosis] = useState<DeploymentDiagnosis | null>(null);
  const [loadingDiagnosis, setLoadingDiagnosis] = useState(false);

  async function retry() {
    setRetrying(true);
    try {
      // Re-runs the same approved plan; Pulumi is stateful, so it resumes
      // from where it failed (e.g. after a permission fix) rather than starting over.
      const result = await api.redeployLatest(deploymentId);
      toast.success("Retrying deployment with the same plan.");
      router.push(`/deployments/${result.deploymentId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not retry the deployment.");
      setRetrying(false);
    }
  }
  const isLong = reason.length > 400 || reason.split("\n").length > 6;
  const bundle = useMemo(
    () => [
      "Failure reason:",
      reason,
      "",
      "Recent logs:",
      ...logs.slice(-12).map((log) => `[${log.status}] ${log.message}`)
    ].join("\n"),
    [logs, reason]
  );

  useEffect(() => {
    let cancelled = false;
    setLoadingDiagnosis(true);
    api.getDeploymentDiagnosis(deploymentId)
      .then((result) => {
        if (!cancelled) setDiagnosis(result.diagnosis);
      })
      .catch(() => {
        if (!cancelled) setDiagnosis(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingDiagnosis(false);
      });
    return () => { cancelled = true; };
  }, [deploymentId]);

  async function copy(text = reason) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Failure details copied to clipboard.");
    } catch {
      toast.error("Clipboard write failed.");
    }
  }

  return (
    <Panel className="border-red-500/20 p-4">
      <div className="flex items-start gap-3">
        <ServerCrash className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] font-medium text-red-400">Deployment failed</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={retry}
                disabled={retrying}
                title="Re-run this deployment with the same plan"
                className="flex items-center gap-1 rounded border border-violet/30 bg-violet/10 px-2 py-1 text-[11px] font-medium text-violet-soft transition-colors hover:bg-violet/20 disabled:opacity-50"
              >
                {retrying ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCw className="h-3 w-3" />}
                {retrying ? "Retrying…" : "Retry"}
              </button>
              <button
                type="button"
                onClick={() => copy(bundle)}
                className="flex items-center gap-1 rounded border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-[11px] text-white/55 transition-colors hover:bg-white/[0.05] hover:text-white"
              >
                <Copy className="h-3 w-3" />
                Copy bundle
              </button>
              {isLong && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="flex items-center gap-1 rounded border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-[11px] text-white/55 transition-colors hover:bg-white/[0.05] hover:text-white"
                >
                  {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {expanded ? "Collapse" : "Expand"}
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-red-500/10 bg-red-500/[0.035] p-3">
            {loadingDiagnosis ? (
              <div className="flex items-center gap-2 text-[12px] text-red-200/70">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Classifying failure
              </div>
            ) : diagnosis ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Wrench className="h-3.5 w-3.5 text-red-300" />
                  <p className="text-[12.5px] font-medium text-red-200">{diagnosis.title}</p>
                  <span className="rounded-full border border-red-500/20 px-2 py-0.5 font-mono text-[10px] text-red-200/55">
                    {diagnosis.category}
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <MiniBlock label="Probable cause" value={diagnosis.probableCause} />
                  <MiniBlock label="Suggested fix" value={diagnosis.suggestedFix} />
                </div>
                {diagnosis.relatedLogs.length > 0 && (
                  <div>
                    <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-red-200/40">Related logs</p>
                    <div className="space-y-1">
                      {diagnosis.relatedLogs.slice(0, 3).map((log, index) => (
                        <p key={`${index}-${log}`} className="truncate font-mono text-[11px] text-red-100/60" title={log}>
                          {log}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[12px] text-red-200/65">Could not load diagnosis. Raw failure is shown below.</p>
            )}
          </div>

          <pre
            className="mt-2 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-md border border-red-500/10 bg-red-500/[0.04] p-3 font-mono text-[11.5px] leading-[1.55] text-red-300/90"
            style={!expanded && isLong ? { maxHeight: COLLAPSED_HEIGHT } : undefined}
          >
            {reason}
          </pre>
        </div>
      </div>
    </Panel>
  );
}

function MiniBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-red-200/40">{label}</p>
      <p className="text-[12px] leading-[1.55] text-red-100/70">{value}</p>
    </div>
  );
}
