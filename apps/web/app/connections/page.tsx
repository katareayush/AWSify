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
            <Panel className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Github className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">GitHub App</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Install AWS-ify on the organization or personal account that owns the repository you want to deploy.
                  </p>
                </div>
                <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">Not connected</span>
              </div>
              {githubInstallations.length === 0 ? (
                <div className="mt-5 rounded-md border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                  No GitHub App installations have been synced yet.
                </div>
              ) : null}
            </Panel>

            <Panel className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">AWS IAM role</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Deploy the generated CloudFormation template in the target AWS account, then paste the RoleArn output here.
                  </p>
                </div>
                <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                  {awsConnections.length === 0 ? "Not connected" : "Configured"}
                </span>
              </div>

              <div className="mt-5 grid gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">External ID</span>
                  <div className="mt-1 flex h-10 items-center justify-between rounded-md border border-border bg-background px-3 text-sm">
                    <span>Created by the backend when a project is saved</span>
                    <Clipboard className="h-4 w-4 text-muted-foreground" />
                  </div>
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Role ARN</span>
                  <input className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="Paste RoleArn from CloudFormation output" />
                </label>
              </div>

              <div className="mt-4 flex gap-2">
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

        <Panel className="p-4">
          <div className="flex gap-3 text-sm text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
            <p>AWS-ify should eventually generate a narrower policy per deployment target. The current MVP role covers only ECS/Fargate deployment primitives.</p>
          </div>
        </Panel>
      </div>
    </ProductShell>
  );
}
