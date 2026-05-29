import { ArrowRight, Cloud, Github, KeyRound, ScanLine, ShieldCheck } from "lucide-react";
import { PageHeading } from "../../components/page-heading";
import { SetupStep } from "../../components/setup-step";
import { Button } from "../../components/ui/button";
import { Panel } from "../../components/ui/panel";

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-foreground text-background">
            <Cloud className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">AWS-ify</p>
            <p className="text-xs text-muted-foreground">Deploy with review-first infrastructure</p>
          </div>
        </div>

        <Panel className="p-6">
          <PageHeading
            eyebrow="Setup"
            title="Prepare your first ECS Fargate deployment"
            description="AWS-ify needs GitHub repo access, an AWS role, a repo scan, and a reviewed plan before anything is created in your AWS account."
            action={
              <Button>
                Start with GitHub
                <ArrowRight className="h-4 w-4" />
              </Button>
            }
          />
        </Panel>

        <div className="grid gap-4 md:grid-cols-2">
          <SetupStep icon={Github} title="Sign in with GitHub" description="Use GitHub identity for the MVP account model." state="active" />
          <SetupStep icon={Github} title="Install GitHub App" description="Grant repository access through installation-scoped permissions." state="pending" />
          <SetupStep icon={KeyRound} title="Connect AWS role" description="Deploy AWS-ify's CloudFormation role and submit the RoleArn." state="pending" />
          <SetupStep icon={ScanLine} title="Scan repository" description="Detect framework, commands, port, env vars, and database signals." state="pending" />
          <SetupStep icon={ShieldCheck} title="Review plan" description="Inspect resources, files, cost range, and approval gate." state="pending" />
        </div>
      </div>
    </main>
  );
}
