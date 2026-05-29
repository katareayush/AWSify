import Link from "next/link";
import { ArrowRight, Cloud, Github, KeyRound, Play, ShieldCheck, TerminalSquare } from "lucide-react";
import { PageHeading } from "../components/page-heading";
import { ProductShell } from "../components/product-shell";
import { SetupStep } from "../components/setup-step";
import { Button } from "../components/ui/button";
import { Panel } from "../components/ui/panel";

const deployments = [
  { name: "express-api", repo: "demo/express-api", status: "Awaiting approval", target: "ECS Fargate", updated: "2m ago" },
  { name: "next-dashboard", repo: "demo/next-dashboard", status: "Scan ready", target: "Next.js on Fargate", updated: "18m ago" }
];

export default function Home() {
  return (
    <ProductShell active="Deployments">
      <div className="space-y-5">
        <PageHeading
          eyebrow="Control plane"
          title="Deployments"
          description="Connect a repository, review the generated plan, and deploy to your AWS account only after approval."
          action={
            <>
              <Button variant="secondary">
                <Github className="h-4 w-4" />
                Connect GitHub
              </Button>
              <Link href="/repositories">
                <Button>
                  New deployment
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </>
          }
        />

        <div className="grid gap-3 md:grid-cols-4">
          <Metric icon={Github} label="Repos connected" value="2" />
          <Metric icon={KeyRound} label="AWS accounts" value="1" />
          <Metric icon={TerminalSquare} label="Plans awaiting approval" value="1" />
          <Metric icon={Cloud} label="Live services" value="0" />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
          <Panel className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Recent deployment plans</p>
              <span className="text-xs text-muted-foreground">MVP workspace</span>
            </div>
            <div className="mt-4 divide-y divide-border">
              {deployments.map((deployment) => (
                <Link key={deployment.name} href="/deployments/demo" className="grid gap-3 py-4 text-sm hover:bg-background sm:grid-cols-[1fr_150px_130px]">
                  <div>
                    <p className="font-medium">{deployment.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{deployment.repo}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{deployment.target}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{deployment.updated}</p>
                  </div>
                  <div className="flex items-center sm:justify-end">
                    <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{deployment.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          </Panel>

          <div className="space-y-3">
            <SetupStep
              icon={Github}
              title="Connect GitHub"
              description="Install the GitHub App and select repositories AWSify can scan."
              state="done"
              meta="demo organization connected"
            />
            <SetupStep
              icon={KeyRound}
              title="Connect AWS"
              description="Create the CloudFormation role and validate the returned ARN."
              state="done"
              meta="us-east-1 default region"
            />
            <SetupStep
              icon={ShieldCheck}
              title="Approve first plan"
              description="Review generated files, cost range, and resources before deployment."
              state="active"
            />
          </div>
        </div>
      </div>
    </ProductShell>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Github; label: string; value: string }) {
  return (
    <Panel className="p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </Panel>
  );
}
