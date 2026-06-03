"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Github, KeyRound, Loader2, ScanLine, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppRoot } from "../../components/app";
import { Mark } from "../../components/landing/primitives/mark";
import { Button } from "../../components/ui/button";
import { api } from "../../lib/api";

interface StepConfig {
  icon: LucideIcon;
  title: string;
  description: string;
}

const steps: StepConfig[] = [
  { icon: Github, title: "Sign in with GitHub", description: "Use your GitHub identity to access AWS-ify." },
  { icon: Github, title: "Install GitHub App", description: "Grant repository access through installation-scoped permissions." },
  { icon: KeyRound, title: "Connect AWS role", description: "Deploy the CloudFormation role and submit the returned RoleArn." },
  { icon: ScanLine, title: "Scan repository", description: "Detect framework, commands, port, env vars, and database signals." },
  { icon: ShieldCheck, title: "Review plan", description: "Inspect resources, files, and cost range before anything deploys." }
];

export default function OnboardingPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.me()
      .then((me) => {
        if (me.authenticated) router.replace("/dashboard");
        else setCheckingAuth(false);
      })
      .catch(() => setCheckingAuth(false));
  }, [router]);

  async function handleSignIn() {
    setError(null);
    setLoading(true);
    try {
      const { url } = await api.loginUrl();
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reach the API.");
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <AppRoot>
        <div className="flex min-h-screen items-center justify-center text-white/40">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </AppRoot>
    );
  }

  return (
    <AppRoot>
      <div className="flex min-h-screen flex-col">
        <TopNav />
        <main className="flex flex-1 items-center justify-center px-5 py-12">
          <div className="w-full max-w-md">
            <p className="text-[11.5px] tracking-wide text-white/45">Setup · step 1 of {steps.length}</p>
            <h1 className="mt-3 text-[24px] font-medium tracking-tight text-white">
              Sign in to get started
            </h1>
            <p className="mt-2 text-[13.5px] leading-[1.6] text-white/55">
              AWS-ify uses your GitHub identity. Once signed in we&apos;ll install the GitHub App and connect your AWS account.
            </p>

            {error && (
              <p className="mt-5 rounded-md border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-[12.5px] text-red-300">
                {error}
              </p>
            )}

            <Button
              size="lg"
              className="mt-6 w-full justify-center gap-2"
              onClick={handleSignIn}
              disabled={loading}
            >
              <Github className="h-4 w-4" />
              {loading ? "Redirecting…" : "Continue with GitHub"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>

            <ol className="mt-10 space-y-3">
              {steps.slice(1).map((step, i) => (
                <PendingStep key={step.title} step={step} index={i + 2} />
              ))}
            </ol>
          </div>
        </main>
      </div>
    </AppRoot>
  );
}

function TopNav() {
  return (
    <header className="flex h-14 items-center border-b border-white/[0.05] px-5">
      <Link href="/" className="flex items-center gap-2.5">
        <Mark />
        <span className="text-[14px] font-medium tracking-tight text-white">AWS-ify</span>
      </Link>
    </header>
  );
}

function PendingStep({ step, index }: { step: StepConfig; index: number }) {
  return (
    <li className="flex items-start gap-3 text-[13px]">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/[0.08] text-[10.5px] text-white/35">
        {index}
      </span>
      <div className="min-w-0">
        <p className="text-white/70">{step.title}</p>
        <p className="mt-0.5 text-[12px] text-white/40">{step.description}</p>
      </div>
    </li>
  );
}
