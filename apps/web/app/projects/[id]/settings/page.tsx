"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Activity, ChevronRight, ExternalLink, FolderX, GitBranch, KeyRound, Loader2, Save, Server } from "lucide-react";
import { ProductShell } from "../../../../components/product-shell";
import { EnvVarsPanel } from "../../../../components/deployments/env-vars-panel";
import { Button } from "../../../../components/ui/button";
import { Panel } from "../../../../components/ui/panel";
import { PageSkeleton } from "../../../../components/ui/skeleton";
import { useToast } from "../../../../components/ui/toast";
import { api, type AuditEvent, type ProjectSettings } from "../../../../lib/api";
import { useAuth } from "../../../../lib/use-auth";

export default function ProjectSettingsPage() {
  return (
    <Suspense fallback={null}>
      <ProjectSettingsPageInner />
    </Suspense>
  );
}

function ProjectSettingsPageInner() {
  const { me, loading: authLoading } = useAuth();
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [settings, setSettings] = useState<ProjectSettings | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [auditUnavailable, setAuditUnavailable] = useState(false);
  const [branch, setBranch] = useState("");
  const [port, setPort] = useState("");
  const [healthPath, setHealthPath] = useState("");

  async function load() {
    const settingsResult = await api.getProjectSettings(id);
    setSettings(settingsResult.settings);
    setBranch(settingsResult.settings.branch);
    setPort(settingsResult.settings.plan?.port ? String(settingsResult.settings.plan.port) : "");
    setHealthPath(settingsResult.settings.plan?.healthPath ?? "/");

    try {
      const eventResult = await api.getProjectAuditEvents(id);
      setEvents(eventResult.events);
      setAuditUnavailable(Boolean(eventResult.unavailable));
    } catch {
      setEvents([]);
      setAuditUnavailable(true);
    }
  }

  useEffect(() => {
    if (authLoading) return;
    if (!me?.authenticated) {
      setLoading(false);
      return;
    }
    load().catch((err) => {
      toast.error(err instanceof Error ? err.message : "Could not load project settings.");
    }).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, me?.authenticated, id]);

  useEffect(() => {
    if (settings?.name) document.title = `${settings.name} settings — AWS-ify`;
  }, [settings?.name]);

  async function saveSettings() {
    setSaving(true);
    try {
      const result = await api.updateProjectSettings(id, {
        branch,
        ...(port ? { port: Number(port) } : {}),
        ...(healthPath ? { healthPath } : {})
      });
      setSettings(result.settings);
      await load();
      toast.success("Project settings saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save project settings.");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <ProductShell active="Settings">
        <PageSkeleton variant="detail" />
      </ProductShell>
    );
  }

  if (!settings) {
    return (
      <ProductShell active="Settings">
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <FolderX className="h-8 w-8 text-white/20" />
          <div>
            <p className="text-[14px] font-medium text-white">Project not found</p>
            <p className="mt-1 text-[12.5px] text-white/45">It may have been deleted, or the link is wrong.</p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/settings">Back to project settings</Link>
          </Button>
        </div>
      </ProductShell>
    );
  }

  const runtimeEditable = settings.plan?.editable ?? false;

  return (
    <ProductShell active="Settings">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <nav className="flex items-center gap-1.5 text-[12px] text-white/40">
              <Link href="/settings" className="transition-colors hover:text-white">
                Settings
              </Link>
              <ChevronRight className="h-3 w-3 text-white/25" />
              <span className="truncate text-white/65">{settings.name}</span>
            </nav>
            <h1 className="mt-2 truncate text-[24px] font-medium tracking-tight text-white sm:text-[28px]">
              {settings.name}
            </h1>
            <p className="mt-1 truncate font-mono text-[12px] text-white/45">{settings.repoFullName}</p>
          </div>
          {settings.latestDeployment && (
            <Button asChild variant="secondary" className="shrink-0 self-start sm:self-auto">
              <Link href={`/deployments/${settings.latestDeployment.id}`}>
                <ExternalLink className="h-3.5 w-3.5" />
                Latest deployment
              </Link>
            </Button>
          )}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-5">
            <Panel className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-violet-soft" />
                <p className="text-[13px] font-medium text-white">Safe settings</p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Branch">
                  <input value={branch} onChange={(event) => setBranch(event.target.value)} className={fieldClassName} />
                </Field>
                <Field label="Port">
                  <input value={port} onChange={(event) => setPort(event.target.value)} disabled={!runtimeEditable} className={fieldClassName} />
                </Field>
                <Field label="Health path">
                  <input value={healthPath} onChange={(event) => setHealthPath(event.target.value)} disabled={!runtimeEditable} className={fieldClassName} />
                </Field>
              </div>
              {!runtimeEditable && (
                <p className="mt-3 text-[11.5px] text-amber-300/75">
                  Runtime settings are editable only while the latest plan is awaiting approval.
                </p>
              )}
              <Button className="mt-4" variant="secondary" onClick={saveSettings} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save settings
              </Button>
            </Panel>

            {settings.latestDeployment ? (
              <EnvVarsPanel
                deploymentId={settings.latestDeployment.id}
                detected={settings.detectedEnvVars}
                saved={settings.envVars}
                onChange={load}
              />
            ) : (
              <Panel className="p-5 text-[13px] text-white/45">Create a deployment before editing environment variables.</Panel>
            )}
          </div>

          <div className="space-y-4">
            <Panel className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <Server className="h-4 w-4 text-violet-soft" />
                <p className="text-[13px] font-medium text-white">Metadata</p>
              </div>
              <Meta label="AWS account" value={settings.awsAccountId ?? "Not connected"} />
              <Meta label="Region" value={settings.awsRegion ?? "Unknown"} />
              <Meta label="Plan" value={settings.plan ? settings.plan.status.replace(/_/g, " ") : "No plan"} />
              <Meta label="Generated files" value={String(settings.plan?.artifactCount ?? 0)} />
              <Meta label="CI token" value={settings.hasCiToken ? "Generated" : "Not generated"} />
            </Panel>

            <Panel className="overflow-hidden">
              <div className="flex items-center gap-2 border-b border-white/[0.05] px-5 py-3">
                <Activity className="h-4 w-4 text-violet-soft" />
                <p className="text-[13px] font-medium text-white">Audit trail</p>
              </div>
              <div className="divide-y divide-white/[0.05]">
                {auditUnavailable ? (
                  <p className="px-5 py-6 text-[12px] text-amber-300/75">
                    Audit storage is not available yet. Settings remain usable.
                  </p>
                ) : events.length === 0 ? (
                  <p className="px-5 py-6 text-[12px] text-white/40">No audit events yet.</p>
                ) : events.slice(0, 12).map((event) => (
                  <div key={event.id} className="px-5 py-3">
                    <p className="text-[12.5px] text-white/80">{event.message}</p>
                    <p className="mt-1 font-mono text-[10.5px] text-white/35">
                      {event.type} · {new Date(event.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel className="p-5">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-violet-soft" />
                <p className="text-[13px] font-medium text-white">Boundary</p>
              </div>
              <p className="mt-2 text-[12px] leading-[1.6] text-white/45">
                This page does not delete projects, disconnect AWS accounts, or destroy infrastructure.
              </p>
            </Panel>
          </div>
        </div>
      </div>
    </ProductShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10.5px] uppercase tracking-wider text-white/35">{label}</span>
      {children}
    </label>
  );
}

const fieldClassName = "h-9 w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 font-mono text-[12px] text-white outline-none placeholder:text-white/25 focus:border-violet/40 disabled:opacity-45";

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.05] py-2.5 text-[12px] last:border-b-0">
      <span className="text-white/40">{label}</span>
      <span className="min-w-0 truncate font-mono text-white/70" title={value}>{value}</span>
    </div>
  );
}
