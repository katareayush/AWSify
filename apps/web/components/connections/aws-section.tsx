"use client";

import { useEffect, useState } from "react";
import { ExternalLink, KeyRound, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { api, type AwsConnection } from "../../lib/api";
import { Field, Input, Section } from "./section";

export function AwsSection() {
  const [connections, setConnections] = useState<AwsConnection[]>([]);
  const [externalId, setExternalId] = useState("");
  const [template, setTemplate] = useState<string | null>(null);
  const [launchStackUrl, setLaunchStackUrl] = useState<string | null>(null);
  const [roleArn, setRoleArn] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    api.listConnections().then((r) => setConnections(r.connections)).catch(() => {});
    api.cfnTemplate().then((r) => {
      setExternalId(r.externalId);
      setTemplate(r.template);
      setLaunchStackUrl(r.launchStackUrl);
    }).catch(() => {});
  }, []);

  async function handleConnect() {
    if (!roleArn.trim() || !externalId) return;
    setConnecting(true);
    setError(null);
    try {
      await api.saveConnection({ roleArn: roleArn.trim(), externalId });
      const r = await api.listConnections();
      setConnections(r.connections);
      setRoleArn("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect to AWS.");
    } finally {
      setConnecting(false);
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

  return (
    <Section
      icon={<KeyRound className="h-4 w-4 text-white/55" />}
      title="AWS"
      status={connections.length > 0 ? `${connections.length} connected` : "Not connected"}
      statusTone={connections.length > 0 ? "ok" : "muted"}
    >
      {connections.length > 0 && (
        <div className="mb-4 divide-y divide-white/[0.04] rounded-lg border border-white/[0.05]">
          {connections.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-4 py-3 text-[12.5px]">
              <span className="font-mono text-white/75">{c.accountId}</span>
              <span className="text-white/40">{c.defaultRegion} · {c.status}</span>
            </div>
          ))}
        </div>
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

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowManual((v) => !v)}
          className="text-[11.5px] text-white/40 underline-offset-2 hover:text-white/70 hover:underline"
        >
          {showManual ? "Hide manual setup" : "Use manual setup instead"}
        </button>
        <Button onClick={handleConnect} disabled={!roleArn.trim() || connecting}>
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
                onClick={() => externalId && navigator.clipboard.writeText(externalId)}
                className="ml-2 shrink-0 text-white/40 transition-colors hover:text-white/80"
              >
                Copy
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
