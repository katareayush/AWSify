"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clipboard, Github, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { PageHeading } from "../../components/page-heading";
import { ProductShell } from "../../components/product-shell";
import { SetupStep } from "../../components/setup-step";
import { Button } from "../../components/ui/button";
import { Panel } from "../../components/ui/panel";
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
    api.listConnections().then(r => setConnections(r.connections)).catch(() => {});
    api.cfnTemplate().then(r => {
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
      <div className="space-y-5">
        <PageHeading
          eyebrow="Connections"
          title="GitHub and AWS access"
          description="AWS-ify keeps source access and cloud execution separate. GitHub App permissions scan repositories; AWS role assumptions execute approved deployments."
        />

        <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            {/* GitHub */}
            <Panel className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Github className="h-4 w-4 text-violet-soft" />
                    <p className="text-[14px] font-medium tracking-tight text-white">GitHub App</p>
                  </div>
                  <p className="mt-3 max-w-xl text-[13.5px] leading-[1.6] text-white/55">
                    Install AWS-ify on the organization or personal account that owns the repositories you want to deploy.
                  </p>
                </div>
                <StatusBadge tone={githubDone ? "violet" : "muted"}>
                  {githubDone ? "Connected" : "Not connected"}
                </StatusBadge>
              </div>
              {githubDone ? (
                <p className="mt-4 text-[13px] text-white/45">
                  Signed in as <span className="text-white/70">@{me.githubLogin}</span>
                </p>
              ) : (
                <Button className="mt-5" variant="secondary" onClick={handleInstallApp}>
                  <Github className="h-4 w-4" />
                  Install GitHub App
                </Button>
              )}
            </Panel>

            {/* AWS */}
            <Panel className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-violet-soft" />
                    <p className="text-[14px] font-medium tracking-tight text-white">AWS IAM role</p>
                  </div>
                  <p className="mt-3 max-w-xl text-[13.5px] leading-[1.6] text-white/55">
                    Deploy the generated CloudFormation template in your AWS account, then paste the output RoleArn here.
                  </p>
                </div>
                <StatusBadge tone={connections.length > 0 ? "violet" : "muted"}>
                  {connections.length > 0 ? `${connections.length} connected` : "Not connected"}
                </StatusBadge>
              </div>

              {connections.length > 0 && (
                <div className="mt-4 divide-y divide-white/[0.05]">
                  {connections.map(c => (
                    <div key={c.id} className="py-3 text-[13px]">
                      <p className="font-mono text-white/70">{c.accountId}</p>
                      <p className="mt-1 text-white/40">{c.defaultRegion} · {c.status}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 grid gap-3">
                <label className="block">
                  <span className="font-mono text-[10.5px] uppercase tracking-wider text-white/45">External ID</span>
                  <div className="mt-2 flex h-10 items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 text-[13px] text-white/55">
                    <span className="font-mono text-[12px]">{externalId || "Loading…"}</span>
                    <button
                      onClick={() => externalId && navigator.clipboard.writeText(externalId)}
                      className="hover:text-white/80 transition-colors"
                    >
                      <Clipboard className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </label>
                <label className="block">
                  <span className="font-mono text-[10.5px] uppercase tracking-wider text-white/45">AWS Account ID</span>
                  <input
                    value={accountId}
                    onChange={e => setAccountId(e.target.value)}
                    className="mt-2 h-10 w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 text-[13px] text-white outline-none placeholder:text-white/30 focus:border-violet/40"
                    placeholder="123456789012"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-[10.5px] uppercase tracking-wider text-white/45">Role ARN</span>
                  <input
                    value={roleArn}
                    onChange={e => setRoleArn(e.target.value)}
                    className="mt-2 h-10 w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 text-[13px] text-white outline-none placeholder:text-white/30 focus:border-violet/40"
                    placeholder="arn:aws:iam::123456789012:role/AWSifyDeploymentRole"
                  />
                </label>
                <label className="block">
                  <span className="font-mono text-[10.5px] uppercase tracking-wider text-white/45">Region</span>
                  <input
                    value={region}
                    onChange={e => setRegion(e.target.value)}
                    className="mt-2 h-10 w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 text-[13px] text-white outline-none placeholder:text-white/30 focus:border-violet/40"
                    placeholder="us-east-1"
                  />
                </label>
              </div>

              {validationResult && (
                <div className={`mt-4 rounded-lg border px-4 py-3 text-[13px] ${validationResult.status === "valid" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-red-500/30 bg-red-500/10 text-red-400"}`}>
                  {validationResult.status === "valid" ? "✓ Role validated successfully" : `✗ ${validationResult.reason ?? "Validation failed"}`}
                </div>
              )}

              <div className="mt-5 flex gap-2">
                <Button variant="secondary" onClick={handleDownloadTemplate} disabled={!template}>
                  Download template
                </Button>
                <Button variant="secondary" onClick={handleValidate} disabled={!roleArn || validating}>
                  {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Validate role"}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={validationResult?.status !== "valid" || saving || !accountId}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save connection"}
                </Button>
              </div>
            </Panel>
          </div>

          <div className="space-y-3">
            <SetupStep icon={Github} title="Source permissions" description="Repo contents and metadata only." state={githubDone ? "done" : "pending"} />
            <SetupStep icon={ShieldCheck} title="External ID trust" description="Prevents confused-deputy role assumption." state={externalId ? "done" : "pending"} />
            <SetupStep icon={KeyRound} title="AWS execution role" description="Used only after plan approval." state={connections.length > 0 ? "done" : "pending"} />
          </div>
        </div>

        <Panel className="p-5">
          <div className="flex gap-3 text-[13px] leading-[1.6] text-white/55">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-soft" />
            <p>The IAM role grants AWS-ify permissions to create ECS, EC2, Lambda, RDS, S3, and CloudFront resources on your behalf. Review the CloudFormation template before deploying it.</p>
          </div>
        </Panel>
      </div>
    </ProductShell>
  );
}

function StatusBadge({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "violet" }) {
  const styles = tone === "violet"
    ? "border-violet/30 bg-violet/10 text-violet-soft"
    : "border-white/[0.08] bg-white/[0.04] text-white/65";
  return <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] ${styles}`}>{children}</span>;
}
