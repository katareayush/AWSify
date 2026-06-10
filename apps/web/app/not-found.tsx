import Link from "next/link";
import { Compass } from "lucide-react";
import { AppRoot } from "../components/app";
import { Button } from "../components/ui/button";

export default function NotFound() {
  return (
    <AppRoot>
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-5 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.04]">
          <Compass className="h-5 w-5 text-white/50" />
        </span>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-violet-soft">404</p>
          <h1 className="mt-2 text-[20px] font-medium tracking-tight text-white">Page not found</h1>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-[1.6] text-white/50">
            The page you&apos;re looking for doesn&apos;t exist or has moved.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </main>
    </AppRoot>
  );
}
