"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, KeyRound, Loader2, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { useToast } from "../ui/toast";
import { api, type AwsConnection } from "../../lib/api";
import { Field, Input, Section } from "./section";

export function AwsSection() {
  const toast = useToast();
  const [connections, setConnections] = useState<AwsConnection[]>([]);
  const [externalId, setExternalId] = useState("");
  const [template, setTemplate] = useState<string | null>(null);
  const [launchStackUrl, setLaunchStackUrl] = useState<string | null>(null);
  const [roleArn, setRoleArn] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [externalIdCopied, setExternalIdCopied] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    api.listConnections().then((r) => setConnections(r.connections)).catch((err) => {
      toast.error(err instanceof Error ? err.message : "Could not load AWS connections.");
    });
    api.cfnTemplate().then((r) => {
      setExternalId(r.externalId);
      setTemplate(r.template);
      setLaunchStackUrl(r.launchStackUrl);
    }).catch((err) => {
      toast.error(err instanceof Error ? err.message : "Could not load AWS template.");
    });
  }, [toast]);

  async function handleConnect() {
    if (!roleArn.trim() || !externalId) return;
    setConnecting(true);
    setError(null);
    try {
      await api.saveConnection({ roleArn: roleArn.trim(), externalId });
      const r = await api.listConnections();
      setConnections(r.connections);
      setRoleArn("");
      // Issue a fresh external ID + launch URL so the user can connect another account.
      const next = await api.cfnTemplate();
      setExternalId(next.externalId);
      setTemplate(next.template);
      setLaunchStackUrl(next.launchStackUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect to AWS.");
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect(connection: AwsConnection) {
    const confirmed = window.confirm(
      `Disconnect AWS account ${connection.accountId}? Projects using it will need a connection re-selected before they can deploy.`
    );
    if (!confirmed) return;
    setRemovingId(connection.id);
    try {
      const result = await api.deleteConnection(connection.id);
      if (result.error) throw new Error(result.error);
      setConnections((prev) => prev.filter((c) => c.id !== connection.id));
      toast.success(`Disconnected AWS account ${connection.accountId}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not disconnect the AWS account.");
    } finally {
      setRemovingId(null);
    }
  }

  function handleDownloadTemplate() {
    if (!template) return;
    const blob = new Blob([template], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "awsify-role.yml";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyExternalId() {
    if (!externalId) return;
    try {
      await navigator.clipboard.writeText(externalId);
      setExternalIdCopied(true);
      setTimeout(() => setExternalIdCopied(false), 1500);
    } catch {
      toast.error("Could not copy external ID.");
    }
  }

  const validCount = connections.filter((connection) => connection.status === "valid").length;
  const statusText = validCount > 0
    ? `${validCount}/${connections.length} valid`
    : connections.length > 0
      ? "Needs attention"
      : "Not connected";

  return (
    <Section
      icon={<KeyRound className="h-4 w-4 text-white/55" />}
      title="AWS"
      status={statusText}
      statusTone={validCount > 0 ? "ok" : "muted"}
    >
      {connections.length > 0 && (
        <div className="mb-4 divide-y divide-white/[0.04] rounded-lg border border-white/[0.05]">
          {connections.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 text-[12.5px]">
              <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0 truncate font-mono text-white/75" title={c.accountId}>{c.accountId}</span>
                <span className="shrink-0 text-white/40">{c.defaultRegion} · {c.status}</span>
              </div>
              <button
                type="button"
                onClick={() => handleDisconnect(c)}
                disabled={removingId === c.id}
                title="Disconnect this AWS account"
                aria-label={`Disconnect AWS account ${c.accountId}`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/40 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
              >
                {removingId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </button>
            </div>
          ))}
        </div>
      )}

      {connections.length > 0 && (
        <p className="mb-3 text-[12px] font-medium text-white/70">Connect another AWS account</p>
      )}

      <ol className="space-y-4">
        <li className="space-y-2">
          <p className="text-[12.5px] text-white/70">
            <span className="mr-2 text-white/40">1.</span>
            Open AWS Console and create the deployment role.
          </p>
          <a
            href={launchStackUrl ?? "#"}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!launchStackUrl}
            className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-[12.5px] transition-colors ${
              launchStackUrl
                ? "border-white/[0.12] bg-white/[0.04] text-white hover:bg-white/[0.08]"
                : "pointer-events-none border-white/[0.06] bg-white/[0.02] text-white/30"
            }`}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Launch Stack in AWS Console
          </a>
        </li>

        <li className="space-y-2">
          <p className="text-[12.5px] text-white/70">
            <span className="mr-2 text-white/40">2.</span>
            After the stack finishes, copy the <span className="font-mono text-white/85">RoleArn</span> from its Outputs tab and paste it here.
          </p>
          <Field label="Role ARN">
            <Input
              value={roleArn}
              onChange={setRoleArn}
              placeholder="arn:aws:iam::123456789012:role/AWSifyDeploymentRole"
            />
          </Field>
        </li>
      </ol>

      {error && (
        <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-300">
          {error}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => setShowManual((v) => !v)}
          className="self-start text-[11.5px] text-white/40 underline-offset-2 hover:text-white/70 hover:underline"
        >
          {showManual ? "Hide manual setup" : "Use manual setup instead"}
        </button>
        <Button onClick={handleConnect} disabled={!roleArn.trim() || connecting} className="sm:shrink-0">
          {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect AWS"}
        </Button>
      </div>

      {showManual && (
        <div className="mt-4 space-y-3 rounded-lg border border-white/[0.05] bg-white/[0.015] p-4">
          <p className="text-[11.5px] text-white/45">
            Prefer to upload the template yourself? Download it, create a CloudFormation stack in your AWS account,
            and use the External ID below when prompted.
          </p>
          <Field label="External ID">
            <div className="flex h-9 items-center justify-between rounded-md border border-white/[0.08] bg-white/[0.02] px-3 text-[12.5px] text-white/55">
              <span className="truncate font-mono">{externalId || "Loading…"}</span>
              <button
                type="button"
                onClick={copyExternalId}
                disabled={!externalId}
                className="ml-2 inline-flex shrink-0 items-center gap-1 text-white/40 transition-colors hover:text-white/80 disabled:opacity-40"
              >
                {externalIdCopied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                {externalIdCopied ? "Copied" : "Copy"}
              </button>
            </div>
          </Field>
          <Button variant="secondary" onClick={handleDownloadTemplate} disabled={!template}>
            Download template
          </Button>
        </div>
      )}
    </Section>
  );
}
