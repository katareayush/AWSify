"use client";

import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";
import { AppRoot } from "../components/app";
import { Button } from "../components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <AppRoot>
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-5 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-red-500/25 bg-red-500/10">
          <AlertTriangle className="h-5 w-5 text-red-300" />
        </span>
        <div>
          <h1 className="text-[20px] font-medium tracking-tight text-white">Something went wrong</h1>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-[1.6] text-white/50">
            An unexpected error occurred while rendering this page. Retrying usually fixes it.
          </p>
          {error.digest && (
            <p className="mt-2 font-mono text-[11px] text-white/30">Error digest: {error.digest}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={reset}>
            <RotateCw className="h-4 w-4" />
            Try again
          </Button>
          <Button asChild variant="secondary">
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        </div>
      </main>
    </AppRoot>
  );
}
