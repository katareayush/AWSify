"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, ChevronDown, ChevronUp, Cloud, ExternalLink, Loader2, ServerCrash, TerminalSquare } from "lucide-react";
import { PageHeading } from "../../../components/page-heading";
import { ProductShell } from "../../../components/product-shell";
import { Panel } from "../../../components/ui/panel";
import { useAuth } from "../../../lib/use-auth";
import { api, type DeploymentDetail } from "../../../lib/api";

const POLLING_STATUSES = new Set(["queued", "scanning", "deploying"]);

function statusColor(s: string) {
  if (s === "deployed") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  if (s === "failed") return "border-red-500/30 bg-red-500/10 text-red-400";
  if (POLLING_STATUSES.has(s)) return "border-violet/30 bg-violet/10 text-violet-soft";
  return "border-white/[0.08] bg-white/[0.04] text-white/65";
}

export default function DeploymentDetailPage() {
  const { me, loading } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<DeploymentDetail | null>(null);
  const [fetching, setFetching] = useState(true);
  const [expandedArtifact, setExpandedArtifact] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
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
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [detail?.logs.length]);

  if (loading || fetching) {
    return (
      <ProductShell active="Templates">
        <div className="flex items-center justify-center py-24 gap-2 text-white/40">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-[13px]">Loading deployment…</span>
        </div>
      </ProductShell>
    );
  }

  if (!detail) {
    return (
      <ProductShell active="Templates">
        <div className="py-24 text-center">
          <p className="text-[14px] font-medium text-white">Deployment not found</p>
        </div>
      </ProductShell>
    );
  }

  const isLive = detail.status === "deployed";
  const isFailed = detail.status === "failed";
  const isRunning = POLLING_STATUSES.has(detail.status);
  const suggestion = detail.plan?.suggestion as Record<string, unknown> | null;

  return (
    <ProductShell active="Templates">
      <div className="space-y-5">
        <PageHeading
          eyebrow={detail.project.repoFullName}
          title={detail.project.name}
          description={`Branch: ${detail.project.branch} · Created ${new Date(detail.createdAt).toLocaleDateString()}`}
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
          <Panel className="border-red-500/20 p-4">
            <div className="flex items-start gap-3">
              <ServerCrash className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <div>
                <p className="text-[13px] font-medium text-red-400">Deployment failed</p>
                <p className="mt-1 font-mono text-[12px] text-red-400/70">{detail.failureReason}</p>
              </div>
            </div>
          </Panel>
        )}

        <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
          {/* Logs */}
          <Panel className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <TerminalSquare className="h-4 w-4 text-violet-soft" />
              <p className="text-[14px] font-medium tracking-tight text-white">Deployment logs</p>
              {isRunning && <Loader2 className="h-3.5 w-3.5 animate-spin text-white/40 ml-auto" />}
            </div>
            <div className="h-[360px] overflow-y-auto rounded-lg border border-white/[0.06] bg-black/40 p-4 font-mono text-[12px] leading-[1.7]">
              {detail.logs.length === 0 ? (
                <span className="text-white/30">Waiting for logs…</span>
              ) : (
                detail.logs.map((log, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="shrink-0 text-white/25">{new Date(log.at).toLocaleTimeString()}</span>
                    <span className={
                      log.status === "failed" ? "text-red-400" :
                      log.status === "deployed" ? "text-emerald-400" :
                      "text-white/70"
                    }>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </Panel>

          {/* Plan summary */}
          <div className="space-y-4">
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
                  ${detail.plan.estimatedCost.low}–${detail.plan.estimatedCost.high}
                  <span className="ml-1 text-[13px] font-normal text-white/40">/mo</span>
                </p>
                {detail.plan.estimatedCost.notes.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {detail.plan.estimatedCost.notes.map((n, i) => (
                      <li key={i} className="text-[12px] text-white/45">· {n}</li>
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
                      <p className="text-[11.5px] text-white/35">{r.type} · {r.purpose}</p>
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
