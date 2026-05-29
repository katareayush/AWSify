import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  Check,
  Cloud,
  Code2,
  FileCode2,
  Github,
  KeyRound,
  Network,
  ShieldCheck,
  TerminalSquare
} from "lucide-react";
import { Button } from "../components/ui/button";

const workflow = [
  ["01", "Connect GitHub", "Install the GitHub App and choose the repositories AWS-ify can inspect."],
  ["02", "Connect AWS", "Create a CloudFormation role so approved deployments run in your account."],
  ["03", "Review the plan", "Check generated files, resources, cost notes, environment inputs, and permissions."],
  ["04", "Deploy", "AWS-ify builds the image, provisions ECS Fargate, and returns the service URL."]
];

const stack = ["Node.js", "Next.js", "Docker", "Pulumi TypeScript", "ECR", "ECS Fargate", "ALB", "CloudWatch"];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <BrandMark />
            <span className="text-sm font-semibold">AWS-ify</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a href="#workflow" className="hover:text-foreground">
              Workflow
            </a>
            <a href="#safety" className="hover:text-foreground">
              Safety
            </a>
            <a href="#stack" className="hover:text-foreground">
              Stack
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="secondary">Open app</Button>
            </Link>
            <Link href="/onboarding" className="hidden sm:block">
              <Button>
                Start
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 pb-14 pt-16 sm:px-6 sm:pb-16 sm:pt-20 lg:pb-20">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-medium text-primary">Review-first AWS deployments</p>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.04] tracking-normal sm:text-6xl lg:text-7xl">
              Deploy from GitHub to AWS without opening the console.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              AWS-ify turns a Node.js or Next.js repository into a reviewed ECS Fargate deployment plan. AI can recommend, but only strict templates execute.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/onboarding">
                <Button className="w-full sm:w-auto">
                  Start setup
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button className="w-full sm:w-auto" variant="secondary">
                  View product
                </Button>
              </Link>
            </div>
          </div>

          <div className="mx-auto mt-12 max-w-6xl">
            <HeroPreview />
          </div>
        </div>
      </section>

      <section id="workflow" className="border-b border-border">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[380px_1fr] lg:py-20">
          <div>
            <p className="text-sm font-medium text-primary">Workflow</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">A narrow path that can actually ship.</h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              The first version does not try to orchestrate every AWS service. It focuses on one dependable path from repository to live ECS service.
            </p>
          </div>

          <div className="divide-y divide-border rounded-md border border-border bg-surface">
            {workflow.map(([number, title, description]) => (
              <div key={title} className="grid gap-4 p-5 sm:grid-cols-[70px_1fr]">
                <span className="text-sm font-medium text-muted-foreground">{number}</span>
                <div>
                  <h3 className="text-base font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="safety" className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1fr] lg:py-20">
          <div className="rounded-md border border-border bg-background p-5 sm:p-6">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Approval boundary
            </div>
            <h2 className="mt-5 text-3xl font-semibold tracking-normal sm:text-4xl">AI does not get AWS credentials.</h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Anthropic recommendations are parsed into a strict schema. AWS-ify validates that schema and maps it to owned Pulumi templates. Nothing mutates AWS before approval.
            </p>
          </div>

          <div className="rounded-md border border-border bg-foreground p-5 text-background sm:p-6">
            <div className="flex items-center gap-2 text-sm font-medium text-background/70">
              <Code2 className="h-4 w-4" />
              execution contract
            </div>
            <pre className="mt-5 overflow-hidden text-xs leading-6 text-background/85 sm:text-sm">
              {`suggestion -> validation -> template

allowed:
  ecr.repository
  ecs.service
  alb.listener
  cloudwatch.logGroup

blocked:
  unreviewed resources
  free-form AWS actions`}
            </pre>
          </div>
        </div>
      </section>

      <section id="stack" className="border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium text-primary">First supported stack</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">Small surface area. Real deployment.</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              AWS-ify starts with Docker-based JavaScript apps on ECS Fargate. Databases, custom domains, and multi-service apps come after the core path is reliable.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stack.map((item) => (
              <div key={item} className="rounded-md border border-border bg-surface px-4 py-3 text-sm font-medium">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function BrandMark() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-background">
      <Cloud className="h-4 w-4" />
    </div>
  );
}

function HeroPreview() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background shadow-panel">
      <div className="flex h-11 items-center justify-between border-b border-border bg-surface px-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
        </div>
        <span className="text-xs text-muted-foreground">plan review</span>
      </div>

      <div className="grid min-h-[420px] lg:grid-cols-[240px_1fr_280px]">
        <aside className="hidden border-r border-border bg-surface p-4 lg:block">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Setup</p>
          <div className="mt-4 space-y-2">
            <PreviewStep icon={Github} label="GitHub" />
            <PreviewStep icon={KeyRound} label="AWS role" />
            <PreviewStep icon={TerminalSquare} label="Repository scan" />
            <PreviewStep icon={FileCode2} label="Plan review" active />
          </div>
        </aside>

        <section className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Deployment plan</p>
              <h3 className="mt-2 text-xl font-semibold">Review before AWS changes</h3>
              <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                Generated files, infrastructure resources, and required configuration are shown before execution.
              </p>
            </div>
            <span className="w-fit rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted-foreground">Waiting for approval</span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <Resource icon={Boxes} label="ECR" />
            <Resource icon={Cloud} label="Fargate" />
            <Resource icon={Network} label="ALB" />
            <Resource icon={TerminalSquare} label="Logs" />
          </div>

          <div className="mt-6 rounded-md border border-border bg-surface p-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FileCode2 className="h-4 w-4 text-primary" />
              Generated artifacts
            </div>
            <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
              <span className="rounded-md border border-border bg-background px-3 py-2">Dockerfile</span>
              <span className="rounded-md border border-border bg-background px-3 py-2">GitHub Action</span>
              <span className="rounded-md border border-border bg-background px-3 py-2">Pulumi preview</span>
            </div>
          </div>
        </section>

        <aside className="border-t border-border bg-surface p-4 lg:border-l lg:border-t-0">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Guardrails</p>
          <div className="mt-4 space-y-3">
            <CheckRow text="Anthropic required" />
            <CheckRow text="Strict schema" />
            <CheckRow text="Template-owned AWS" />
            <CheckRow text="User approval gate" />
          </div>
          <div className="mt-6 rounded-md border border-border bg-background p-3">
            <p className="text-xs font-medium text-muted-foreground">Execution</p>
            <p className="mt-2 text-sm font-semibold">Blocked until approved</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function PreviewStep({ icon: Icon, label, active = false }: { icon: typeof Github; label: string; active?: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${active ? "bg-background text-foreground" : "text-muted-foreground"}`}>
      <Icon className="h-4 w-4" />
      {label}
    </div>
  );
}

function Resource({ icon: Icon, label }: { icon: typeof Cloud; label: string }) {
  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-3 text-sm font-medium">{label}</p>
    </div>
  );
}

function CheckRow({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Check className="h-4 w-4 text-primary" />
      {text}
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-surface">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_2fr]">
        <div>
          <Link href="/" className="flex items-center gap-3">
            <BrandMark />
            <span className="text-sm font-semibold">AWS-ify</span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
            A review-first deployment control plane for GitHub apps running in your AWS account.
          </p>
        </div>

        <div className="grid gap-6 text-sm sm:grid-cols-3">
          <FooterGroup title="Product" links={[["Workflow", "#workflow"], ["Safety", "#safety"], ["Stack", "#stack"]]} />
          <FooterGroup title="App" links={[["Dashboard", "/dashboard"], ["Onboarding", "/onboarding"], ["Connections", "/connections"]]} />
          <FooterGroup title="Principles" links={[["Templates execute", "#safety"], ["User approves", "#workflow"], ["AWS stays yours", "#stack"]]} />
        </div>
      </div>
    </footer>
  );
}

function FooterGroup({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div>
      <p className="font-semibold">{title}</p>
      <div className="mt-3 space-y-2">
        {links.map(([label, href]) => (
          <Link key={label} href={href} className="block text-muted-foreground hover:text-foreground">
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
