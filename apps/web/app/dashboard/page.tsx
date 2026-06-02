"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Cloud, Github, KeyRound, ShieldCheck, TerminalSquare } from "lucide-react";
import { PageHeading } from "../../components/page-heading";
import { ProductShell } from "../../components/product-shell";
import { SetupStep } from "../../components/setup-step";
import { Button } from "../../components/ui/button";
import { Panel } from "../../components/ui/panel";
import { useAuth } from "../../lib/use-auth";
import { api, type Deployment, type AwsConnection } from "../../lib/api";

function statusColor(s: string) {
  if (s === "deployed") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  if (s === "failed") return "border-red-500/30 bg-red-500/10 text-red-400";
  if (s === "deploying") return "border-violet/30 bg-violet/10 text-violet-soft";
  return "border-white/[0.08] bg-white/[0.04] text-white/65";
}

export default function DashboardPage() {
  const { me, loading } = useAuth();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [connections, setConnections] = useState<AwsConnection[]>([]);

  useEffect(() => {
    if (!me?.authenticated) return;
    api.listDeployments().then(r => setDeployments(r.deployments)).catch(() => {});
    api.listConnections().then(r => setConnections(r.connections)).catch(() => {});
  }, [me?.authenticated]);

  if (loading) return null;

  const liveCount = deployments.filter(d => d.status === "deployed").length;
  const pendingCount = deployments.filter(d => ["queued", "scanning", "deploying"].includes(d.status)).length;

  const githubDone = me?.authenticated;
  const awsDone = connections.length > 0;

  return (
    <ProductShell active="Deployments">
      <div className="space-y-5">
        <PageHeading
          eyebrow="Control plane"
          title="Deployments"
          description="Connect GitHub and AWS, then select a repository to create the first deployment."
          action={
            <>
              <Button asChild variant="secondary">
                <Link href="/connections">
                  <KeyRound className="h-4 w-4" />
                  {awsDone ? "Manage connections" : "Connect AWS"}
                </Link>
              </Button>
              <Button asChild>
                <Link href="/repositories">
                  New deployment
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </>
          }
        />

        <div className="grid gap-3 md:grid-cols-4">
          <Metric icon={Github} label="GitHub" value={githubDone ? "Connected" : "Not connected"} />
          <Metric icon={KeyRound} label="AWS accounts" value={String(connections.length)} />
          <Metric icon={TerminalSquare} label="In progress" value={String(pendingCount)} />
          <Metric icon={Cloud} label="Live services" value={String(liveCount)} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <Panel className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-[14px] font-medium tracking-tight text-white">Recent deployments</p>
              <span className="font-mono text-[10.5px] uppercase tracking-wider text-white/35">
                {me?.githubLogin ?? "workspace"}
              </span>
            </div>
            <div className="mt-5 divide-y divide-white/[0.05]">
              {deployments.length === 0 ? (
                <div className="py-14 text-center">
                  <p className="text-[14px] font-medium text-white">No deployments yet</p>
                  <p className="mx-auto mt-2 max-w-md text-[13px] leading-[1.6] text-white/55">
                    Connect GitHub and AWS, then pick a repository to deploy.
                  </p>
                  <Button asChild variant="secondary" className="mt-5">
                    <Link href="/repositories">
                      Select repository
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ) : (
                deployments.map(d => (
                  <Link
                    key={d.id}
                    href={`/deployments/${d.id}`}
                    className="grid gap-3 py-4 text-[13.5px] transition-colors hover:bg-white/[0.02] sm:grid-cols-[1fr_180px_130px]"
                  >
                    <div>
                      <p className="font-medium text-white">{d.project.name}</p>
                      <p className="mt-1 font-mono text-[11px] text-white/45">{d.project.repoFullName} · {d.project.branch}</p>
                    </div>
                    <div>
                      {d.liveUrl ? (
                        <p className="truncate text-violet-soft text-[12px]">{d.liveUrl}</p>
                      ) : (
                        <p className="text-white/40 text-[12px]">—</p>
                      )}
                      <p className="mt-1 font-mono text-[11px] text-white/45">
                        {new Date(d.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center sm:justify-end">
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] ${statusColor(d.status)}`}>
                        {d.status}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Panel>

          <div className="space-y-3">
            <SetupStep
              icon={Github}
              title="Connect GitHub"
              description="Install the GitHub App and select repositories AWS-ify can scan."
              state={githubDone ? "done" : "pending"}
            />
            <SetupStep
              icon={KeyRound}
              title="Connect AWS"
              description="Create the CloudFormation role and validate the returned ARN."
              state={awsDone ? "done" : "pending"}
            />
            <SetupStep
              icon={ShieldCheck}
              title="Deploy a repository"
              description="Pick a repo and AWS-ify scans, plans, and deploys it."
              state={liveCount > 0 ? "done" : "pending"}
            />
          </div>
        </div>
      </div>
    </ProductShell>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Github; label: string; value: string }) {
  return (
    <Panel className="p-5">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-violet-soft" />
        <p className="font-mono text-[10.5px] uppercase tracking-wider text-white/45">{label}</p>
      </div>
      <p className="mt-4 font-mono text-[22px] font-medium tracking-tight text-white">{value}</p>
    </Panel>
  );
}
