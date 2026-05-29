import Link from "next/link";
import { ArrowRight, CircleDashed, Github, KeyRound, ScanLine, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppRoot } from "../../components/app";
import { Mark } from "../../components/landing/primitives/mark";
import { Button } from "../../components/ui/button";

interface StepConfig {
  icon: LucideIcon;
  title: string;
  description: string;
  cta?: string;
}

const steps: StepConfig[] = [
  {
    icon: Github,
    title: "Sign in with GitHub",
    description: "Use your GitHub identity for the AWS-ify account model. No separate sign-up required.",
    cta: "Continue with GitHub",
  },
  {
    icon: Github,
    title: "Install GitHub App",
    description: "Grant repository access through installation-scoped permissions.",
  },
  {
    icon: KeyRound,
    title: "Connect AWS role",
    description: "Deploy the CloudFormation role and submit the returned RoleArn.",
  },
  {
    icon: ScanLine,
    title: "Scan repository",
    description: "Detect framework, commands, port, env vars, and database signals.",
  },
  {
    icon: ShieldCheck,
    title: "Review plan",
    description: "Inspect resources, files, cost range, and approval gate before anything deploys.",
  },
];

export default function OnboardingPage() {
  const active = steps[0];
  const pending = steps.slice(1);

  return (
    <AppRoot>
      <div className="relative flex min-h-screen flex-col">
        <TopNav />

        <main className="flex flex-1 items-center justify-center px-4 py-12 sm:py-16">
          <div className="w-full max-w-[500px]">
            <StepProgress total={steps.length} current={1} />

            <div className="mt-8">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-violet-soft">
                Setup
              </p>
              <h1 className="mt-3 text-[26px] font-medium leading-[1.15] tracking-tight text-white sm:text-[30px]">
                Prepare your first ECS Fargate deployment
              </h1>
              <p className="mt-3 text-[14px] leading-[1.65] text-white/45">
                AWS-ify needs GitHub access, an AWS role, a repo scan, and a reviewed plan before anything is created in your account.
              </p>
            </div>

            <ActiveStep step={active} index={1} />

            <div className="mt-2 space-y-1.5">
              {pending.map((step, i) => (
                <PendingStep key={step.title} step={step} index={i + 2} />
              ))}
            </div>
          </div>
        </main>
      </div>
    </AppRoot>
  );
}

function TopNav() {
  return (
    <header className="flex h-14 shrink-0 items-center border-b border-white/[0.05] px-5 sm:px-6">
      <Link href="/" className="flex items-center gap-2.5">
        <Mark />
        <span className="text-[15px] font-medium tracking-tight text-white">AWS-ify</span>
      </Link>
      <span className="mx-4 h-4 w-px bg-white/[0.08]" />
      <p className="text-[13px] text-white/35">Deployment setup</p>
    </header>
  );
}

function StepProgress({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-[3px] rounded-full transition-all duration-300 ${
              i < current
                ? "w-8 bg-violet shadow-[0_0_8px_rgba(139,92,246,0.7)]"
                : "w-3 bg-white/[0.1]"
            }`}
          />
        ))}
      </div>
      <p className="font-mono text-[11px] text-white/30">
        {current} of {total}
      </p>
    </div>
  );
}

function ActiveStep({ step, index }: { step: StepConfig; index: number }) {
  const Icon = step.icon;

  return (
    <div className="relative mt-6 overflow-hidden rounded-2xl border border-violet/[0.22] shadow-[0_0_80px_-20px_rgba(139,92,246,0.45)]">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-violet/[0.07] to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-grid-fine opacity-20" />
      <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-violet/20 blur-3xl" />

      <div className="relative p-6 sm:p-7">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet/15 ring-1 ring-inset ring-violet/30 shadow-[0_0_20px_-4px_rgba(139,92,246,0.5)]">
            <Icon className="h-5 w-5 text-violet-soft" />
          </div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-violet-soft/60">
            Step {index} · active
          </p>
        </div>

        <h2 className="mt-4 text-[19px] font-medium tracking-tight text-white">
          {step.title}
        </h2>
        <p className="mt-2 text-[13.5px] leading-[1.7] text-white/50">
          {step.description}
        </p>

        <Button size="lg" className="mt-6 w-full justify-center gap-2">
          <Icon className="h-4 w-4" />
          {step.cta ?? "Continue"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function PendingStep({ step, index }: { step: StepConfig; index: number }) {
  const Icon = step.icon;

  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] font-mono text-[10.5px] text-white/25">
        {index}
      </div>
      <Icon className="h-3.5 w-3.5 shrink-0 text-white/25" />
      <p className="text-[13px] text-white/40">{step.title}</p>
      <CircleDashed className="ml-auto h-3.5 w-3.5 shrink-0 text-white/15" />
    </div>
  );
}
