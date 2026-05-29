import { ArrowRight, CheckCircle2, Clipboard, Github, KeyRound, ShieldCheck } from "lucide-react";
import { PageHeading } from "../../components/page-heading";
import { ProductShell } from "../../components/product-shell";
import { SetupStep } from "../../components/setup-step";
import { Button } from "../../components/ui/button";
import { Panel } from "../../components/ui/panel";

export default function ConnectionsPage() {
  const githubInstallations: Array<{ id: string; account: string; repositoryCount: number }> = [];
  const awsConnections: Array<{ id: string; accountId: string; region: string; status: string }> = [];

  return (
    <ProductShell active="Connections">
      <div className="space-y-5">
        <PageHeading
          eyebrow="Connections"
          title="GitHub and AWS access"
          description="AWS-ify keeps source access and cloud execution separate. GitHub App permissions scan repositories; AWS role assumptions execute approved templates."
        />

        <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <div className="space-y-4">
            <Panel className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Github className="h-4 w-4 text-violet-soft" />
                    <p className="text-[14px] font-medium tracking-tight text-white">GitHub App</p>
                  </div>
                  <p className="mt-3 max-w-xl text-[13.5px] leading-[1.6] text-white/55">
                    Install AWS-ify on the organization or personal account that owns the repository you want to deploy.
                  </p>
                </div>
                <StatusBadge tone="muted">Not connected</StatusBadge>
              </div>
              {githubInstallations.length === 0 ? (
                <div className="mt-5 rounded-lg border border-dashed border-white/[0.1] bg-white/[0.015] p-4 text-[13px] text-white/45">
                  No GitHub App installations have been synced yet.
                </div>
              ) : null}
            </Panel>

            <Panel className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-violet-soft" />
                    <p className="text-[14px] font-medium tracking-tight text-white">AWS IAM role</p>
                  </div>
                  <p className="mt-3 max-w-xl text-[13.5px] leading-[1.6] text-white/55">
                    Deploy the generated CloudFormation template in the target AWS account, then paste the RoleArn output here.
                  </p>
                </div>
                <StatusBadge tone="muted">
                  {awsConnections.length === 0 ? "Not connected" : "Configured"}
                </StatusBadge>
              </div>

              <div className="mt-5 grid gap-3">
                <label className="block">
                  <span className="font-mono text-[10.5px] uppercase tracking-wider text-white/45">
                    External ID
                  </span>
                  <div className="mt-2 flex h-10 items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 text-[13px] text-white/55">
                    <span>Created by the backend when a project is saved</span>
                    <Clipboard className="h-3.5 w-3.5 text-white/35" />
                  </div>
                </label>
                <label className="block">
                  <span className="font-mono text-[10.5px] uppercase tracking-wider text-white/45">
                    Role ARN
                  </span>
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 text-[13px] text-white outline-none placeholder:text-white/30 focus:border-violet/40 focus:ring-2 focus:ring-violet/20"
                    placeholder="Paste RoleArn from CloudFormation output"
                  />
                </label>
              </div>

              <div className="mt-5 flex gap-2">
                <Button variant="secondary">
                  Download template
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button>Validate role</Button>
              </div>
            </Panel>
          </div>

          <div className="space-y-3">
            <SetupStep icon={Github} title="Source permissions" description="Repo contents and metadata only." state="pending" />
            <SetupStep icon={ShieldCheck} title="External ID trust" description="Prevents confused-deputy role assumption." state="pending" />
            <SetupStep icon={KeyRound} title="AWS execution role" description="Used only after plan approval." state="pending" />
          </div>
        </div>

        <Panel className="p-5">
          <div className="flex gap-3 text-[13px] leading-[1.6] text-white/55">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-soft" />
            <p>
              AWS-ify should eventually generate a narrower policy per deployment target.
              The current MVP role covers only ECS/Fargate deployment primitives.
            </p>
          </div>
        </Panel>
      </div>
    </ProductShell>
  );
}

function StatusBadge({
  children,
  tone = "muted"
}: {
  children: React.ReactNode;
  tone?: "muted" | "violet";
}) {
  const styles =
    tone === "violet"
      ? "border-violet/30 bg-violet/10 text-violet-soft"
      : "border-white/[0.08] bg-white/[0.04] text-white/65";
  return (
    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] ${styles}`}>
      {children}
    </span>
  );
}
