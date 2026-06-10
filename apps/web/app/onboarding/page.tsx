"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowRight, Github, KeyRound, Loader2, ScanLine, ShieldCheck, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppRoot } from "../../components/app";
import { Wordmark } from "../../components/landing/primitives/wordmark";
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

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "GitHub did not return an authorization code. Try signing in again.",
  invalid_oauth_state: "The login attempt expired or was tampered with. Please retry sign-in.",
  github_auth_error: "Could not reach GitHub to complete sign-in. Check your network and retry.",
  github_auth_failed: "GitHub refused the authorization code. Please try again.",
  not_authenticated: "Your session expired. Please sign in again."
};

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingPageInner />
    </Suspense>
  );
}

function OnboardingPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const authError = params.get("error");
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

  useEffect(() => {
    setError(authError ? ERROR_MESSAGES[authError] ?? `Sign-in failed: ${authError}` : null);
  }, [authError]);

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

  function dismissError() {
    setError(null);
    const next = new URLSearchParams(params.toString());
    next.delete("error");
    const query = next.toString();
    router.replace(query ? `/onboarding?${query}` : "/onboarding");
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

            {error && <AuthErrorMessage message={error} onDismiss={dismissError} />}

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

            <ol className="mt-10">
              {steps.map((step, i) => (
                <OnboardingStep
                  key={step.title}
                  step={step}
                  index={i + 1}
                  current={i === 0}
                  isLast={i === steps.length - 1}
                />
              ))}
            </ol>
          </div>
        </main>
      </div>
    </AppRoot>
  );
}

function AuthErrorMessage({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="mt-5 flex items-start gap-2.5 rounded-md border border-red-500/20 bg-red-500/[0.06] px-3 py-2.5 text-red-300">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1 text-[12.5px] leading-[1.5]">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss sign-in error"
        className="-m-1 rounded p-1 text-red-300/70 transition-colors hover:bg-red-500/10 hover:text-red-200"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function TopNav() {
  return (
    <header className="flex h-14 items-center border-b border-white/[0.05] px-5">
      <Link href="/" className="flex items-center">
        <Wordmark size={16} />
      </Link>
    </header>
  );
}

function OnboardingStep({
  step,
  index,
  current,
  isLast
}: {
  step: StepConfig;
  index: number;
  current: boolean;
  isLast: boolean;
}) {
  return (
    <li className="flex gap-3 text-[13px]">
      <div className="flex flex-col items-center">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10.5px] ${
            current
              ? "border-violet/50 bg-violet/15 font-medium text-violet-soft shadow-glow"
              : "border-white/[0.08] text-white/35"
          }`}
        >
          {index}
        </span>
        {!isLast && <span className="my-1 w-px flex-1 bg-white/[0.07]" style={{ minHeight: 14 }} />}
      </div>
      <div className={`min-w-0 ${isLast ? "" : "pb-4"}`}>
        <p className={current ? "font-medium text-white" : "text-white/70"}>
          {step.title}
          {current && (
            <span className="ml-2 rounded-full border border-violet/30 bg-violet/10 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-violet-soft">
              You are here
            </span>
          )}
        </p>
        <p className="mt-0.5 text-[12px] leading-[1.5] text-white/40">{step.description}</p>
      </div>
    </li>
  );
}
