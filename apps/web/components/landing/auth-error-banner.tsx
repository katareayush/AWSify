"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, X } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "GitHub did not return an authorization code. Try signing in again.",
  invalid_oauth_state: "The login attempt expired or was tampered with. Please retry sign-in.",
  github_auth_error: "Could not reach GitHub to complete sign-in. Check your network and retry.",
  github_auth_failed: "GitHub refused the authorization code. Please try again.",
  not_authenticated: "Your session expired. Please sign in again.",
  invalid_app_install_state: "The GitHub App install attempt expired. Please retry.",
  installation_lookup_failed: "Could not load the GitHub App installation. Try reinstalling.",
  installation_account_missing: "GitHub did not return the installation account. Try reinstalling.",
  missing_installation_id: "GitHub did not return an installation ID. Try reinstalling."
};

export function AuthErrorBanner() {
  const router = useRouter();
  const params = useSearchParams();
  const error = params.get("error");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(false);
  }, [error]);

  if (!error || dismissed) return null;

  const message = ERROR_MESSAGES[error] ?? `Sign-in failed: ${error}`;

  function dismiss() {
    setDismissed(true);
    const next = new URLSearchParams(params.toString());
    next.delete("error");
    const query = next.toString();
    router.replace(query ? `/?${query}` : "/");
  }

  return (
    <div className="fixed inset-x-0 top-24 z-[60] mx-auto flex max-w-2xl items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-200 shadow-[0_18px_50px_-12px_rgba(239,68,68,0.4)] backdrop-blur-xl">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
      <div className="flex-1 leading-[1.55]">
        <p className="font-medium text-red-100">Sign-in didn&apos;t complete</p>
        <p className="mt-0.5 text-red-200/85">{message}</p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="-m-1 rounded p-1 text-red-200/70 transition-colors hover:text-red-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
