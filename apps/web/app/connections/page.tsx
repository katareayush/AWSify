"use client";

import { useEffect, useState } from "react";
import { Clipboard, Github, KeyRound, Loader2 } from "lucide-react";
import { ProductShell } from "../../components/product-shell";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../lib/use-auth";
import { api, type AwsConnection } from "../../lib/api";

export default function ConnectionsPage() {
  const { me, loading } = useAuth();
  const [connections, setConnections] = useState<AwsConnection[]>([]);
  const [externalId, setExternalId] = useState("");
  const [template, setTemplate] = useState<string | null>(null);
  const [roleArn, setRoleArn] = useState("");
  const [accountId, setAccountId] = useState("");
  const [region, setRegion] = useState("us-east-1");
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ status: string; reason?: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!me?.authenticated) return;
    api.listConnections().then((r) => setConnections(r.connections)).catch(() => {});
    api.cfnTemplate().then((r) => {
      setExternalId(r.externalId);
      setTemplate(r.template);
    }).catch(() => {});
  }, [me?.authenticated]);

  async function handleInstallApp() {
    try {
      const { url } = await api.appInstallUrl();
      window.location.href = url;
    } catch { /* ignore */ }
  }

  async function handleValidate() {
    if (!roleArn || !externalId) return;
    setValidating(true);
    setValidationResult(null);
    try {
      const result = await api.validateConnection({ roleArn, externalId, region });
      setValidationResult(result);
    } catch (err) {
      setValidationResult({ status: "invalid", reason: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setValidating(false);
    }
  }

  async function handleSave() {
    if (!roleArn || !externalId || !accountId) return;
    setSaving(true);
    try {
      await api.saveConnection({ roleArn, externalId, accountId, region });
      const r = await api.listConnections();
      setConnections(r.connections);
      setRoleArn("");
      setAccountId("");
      setValidationResult(null);
    } catch (err) {
      alert(`Failed to save: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadTemplate() {
    if (!template) return;
    const blob = new Blob([template], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "awsify-role.yml";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return null;

  const githubDone = me?.authenticated;

  return (
    <ProductShell active="Connections">
      <div className="space-y-6">
        <h1 className="text-[22px] font-medium tracking-tight text-white">Connections</h1>

        <Section
          icon={<Github className="h-4 w-4 text-white/55" />}
          title="GitHub"
          status={githubDone ? "Connected" : "Not connected"}
          statusTone={githubDone ? "ok" : "muted"}
        >
          {githubDone ? (
            <p className="text-[13px] text-white/55">
              Signed in as <span className="text-white/80">@{me.githubLogin}</span>
            </p>
          ) : (
            <Button variant="secondary" onClick={handleInstallApp}>
              <Github className="h-4 w-4" />
              Install GitHub App
            </Button>
          )}
        </Section>

        <Section
          icon={<KeyRound className="h-4 w-4 text-white/55" />}
          title="AWS IAM role"
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

          <div className="grid gap-3">
            <Field label="External ID">
              <div className="flex h-9 items-center justify-between rounded-md border border-white/[0.08] bg-white/[0.02] px-3 text-[12.5px] text-white/55">
                <span className="truncate font-mono">{externalId || "Loading…"}</span>
                <button
                  type="button"
                  onClick={() => externalId && navigator.clipboard.writeText(externalId)}
                  className="ml-2 shrink-0 text-white/40 transition-colors hover:text-white/80"
                >
                  <Clipboard className="h-3.5 w-3.5" />
                </button>
              </div>
            </Field>
            <Field label="AWS account ID">
              <Input value={accountId} onChange={setAccountId} placeholder="123456789012" />
            </Field>
            <Field label="Role ARN">
              <Input value={roleArn} onChange={setRoleArn} placeholder="arn:aws:iam::123456789012:role/AWSifyDeploymentRole" />
            </Field>
            <Field label="Region">
              <Input value={region} onChange={setRegion} placeholder="us-east-1" />
            </Field>
          </div>

          {validationResult && (
            <div
              className={`mt-4 rounded-md border px-3 py-2 text-[12.5px] ${
                validationResult.status === "valid"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-red-500/30 bg-red-500/10 text-red-300"
              }`}
            >
              {validationResult.status === "valid"
                ? "Role validated"
                : validationResult.reason ?? "Validation failed"}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={handleDownloadTemplate} disabled={!template}>
              Download template
            </Button>
            <Button variant="secondary" onClick={handleValidate} disabled={!roleArn || validating}>
              {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Validate"}
            </Button>
            <Button
              onClick={handleSave}
              disabled={validationResult?.status !== "valid" || saving || !accountId}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save connection"}
            </Button>
          </div>
        </Section>

        <p className="text-[12px] leading-[1.6] text-white/40">
          The IAM role grants only the permissions required for the ECS Fargate deployment path: ECR images, ECS services, an ALB, CloudWatch logs, and the scoped task roles. Review the CloudFormation template before deploying.
        </p>
      </div>
    </ProductShell>
  );
}

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  status: string;
  statusTone: "ok" | "muted";
  children: React.ReactNode;
}

function Section({ icon, title, status, statusTone, children }: SectionProps) {
  return (
    <div className="rounded-xl border border-white/[0.06]">
      <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-3">
        <div className="flex items-center gap-2.5">
          {icon}
          <p className="text-[13px] font-medium text-white">{title}</p>
        </div>
        <span
          className={`text-[11.5px] ${
            statusTone === "ok" ? "text-emerald-300" : "text-white/40"
          }`}
        >
          {status}
        </span>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] text-white/45">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-9 w-full rounded-md border border-white/[0.08] bg-white/[0.02] px-3 text-[12.5px] text-white outline-none placeholder:text-white/25 focus:border-white/20"
    />
  );
}
