import {
  Activity,
  ArrowRight,
  Boxes,
  Check,
  ChevronDown,
  CircleDollarSign,
  Code2,
  FileCode2,
  Github,
  GitPullRequest,
  KeyRound,
  ListChecks,
  LockKeyhole,
  Play,
  ShieldCheck,
  TerminalSquare,
  Workflow
} from "lucide-react";
import { InfraDiagram } from "../../../components/infra-diagram";
import { PageHeading } from "../../../components/page-heading";
import { ProductShell } from "../../../components/product-shell";
import { StatusTimeline } from "../../../components/status-timeline";
import { Button } from "../../../components/ui/button";
import { Panel } from "../../../components/ui/panel";

const resources = [
  { name: "ECR repository", detail: "Private image registry", cost: "Low" },
  { name: "ECS service", detail: "1 Fargate task, 512 CPU / 1 GB", cost: "Usage" },
  { name: "Application Load Balancer", detail: "Public HTTP entrypoint", cost: "Fixed" },
  { name: "CloudWatch log group", detail: "14 day retention", cost: "Usage" },
  { name: "IAM task roles", detail: "Execution + app task roles", cost: "Free" }
];

const envVars = [
  { name: "DATABASE_URL", status: "Required", tone: "amber" },
  { name: "JWT_SECRET", status: "Required", tone: "amber" },
  { name: "PORT", status: "Detected: 3000", tone: "green" }
];

const files = [
  { name: "Dockerfile", description: "Node 22 multi-stage image" },
  { name: "awsify-deploy.yml", description: "GitHub Actions placeholder" },
  { name: "pulumi preview", description: "Strict ECS/Fargate template" }
];

const logs = [
  "Repository scan completed in 8.4s",
  "Detected Express dependency and npm scripts",
  "AI suggestion validated against AWSify schema",
  "Plan awaiting approval before AWS changes"
];

export default function DeploymentDetailPage() {
  return (
    <ProductShell active="Deployments">
      <div className="space-y-5">
        <PageHeading
          eyebrow="Projects / demo / express-api"
          title="Express API deployment"
          description="AWSify scanned the repository and prepared an ECS Fargate plan. No AWS resources will be created until this plan is approved."
          action={
            <>
              <Button variant="secondary">
                <GitPullRequest className="h-4 w-4" />
                main
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button variant="secondary">
                <Activity className="h-4 w-4" />
                Preview plan
              </Button>
            </>
          }
        />

        <div className="grid gap-3 md:grid-cols-4">
          <Signal icon={Github} label="Repository" value="demo/express-api" />
          <Signal icon={TerminalSquare} label="Runtime" value="Node backend" />
          <Signal icon={LockKeyhole} label="AWS access" value="Role validated" />
          <Signal icon={CircleDollarSign} label="Est. monthly" value="$20-75" />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <Panel className="p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                    <Workflow className="h-4 w-4" />
                    Infrastructure graph
                  </div>
                  <h2 className="mt-2 text-lg font-semibold">Docker image to ECS Fargate behind an ALB</h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                    The graph shows only resources AWSify templates are allowed to create in the MVP.
                  </p>
                </div>
                <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">Template locked</span>
              </div>
              <div className="mt-5">
                <InfraDiagram />
              </div>
            </Panel>

            <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
              <Panel className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Resources</p>
                  <span className="text-xs text-muted-foreground">5 planned</span>
                </div>
                <div className="mt-4 divide-y divide-border">
                  {resources.map((resource) => (
                    <div key={resource.name} className="grid gap-3 py-3 text-sm sm:grid-cols-[1fr_90px]">
                      <div>
                        <p className="font-medium">{resource.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{resource.detail}</p>
                      </div>
                      <div className="flex items-center justify-start sm:justify-end">
                        <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{resource.cost}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel className="p-5">
                <p className="text-sm font-semibold">Generated files</p>
                <div className="mt-4 space-y-3">
                  {files.map((file) => (
                    <div key={file.name} className="rounded-md border border-border bg-background p-3">
                      <div className="flex items-center gap-2">
                        <FileCode2 className="h-4 w-4 text-primary" />
                        <p className="text-sm font-medium">{file.name}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{file.description}</p>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>

          <div className="space-y-5">
            <Panel className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Deployment readiness</p>
                <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">3/5</span>
              </div>
              <div className="mt-5">
                <StatusTimeline />
              </div>
            </Panel>

            <Panel className="p-5">
              <p className="text-sm font-semibold">Environment</p>
              <div className="mt-4 space-y-3">
                {envVars.map((envVar) => (
                  <div key={envVar.name} className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{envVar.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{envVar.status}</p>
                    </div>
                    <span className={`h-2 w-2 rounded-full ${envVar.tone === "green" ? "bg-primary" : "bg-accent"}`} />
                  </div>
                ))}
              </div>
              <Button className="mt-4 w-full" variant="secondary">
                Edit variables
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Panel>

            <Panel className="p-5">
              <div className="flex items-center gap-2">
                <Boxes className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold">Scan output</p>
              </div>
              <div className="mt-4 space-y-2">
                {logs.map((log) => (
                  <div key={log} className="flex gap-2 text-xs leading-5 text-muted-foreground">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>

        <Panel className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent-foreground">
                <ListChecks className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Approval gate</p>
                <p className="mt-1 text-sm text-muted-foreground">Approving will queue the worker to build, push, provision, and health-check the service.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary">
                <Code2 className="h-4 w-4" />
                Review artifacts
              </Button>
              <Button>
                <Play className="h-4 w-4" />
                Approve deployment
              </Button>
            </div>
          </div>
        </Panel>
      </div>
    </ProductShell>
  );
}

function Signal({ icon: Icon, label, value }: { icon: typeof Github; label: string; value: string }) {
  return (
    <Panel className="p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
      <p className="mt-3 truncate text-sm font-semibold">{value}</p>
    </Panel>
  );
}
