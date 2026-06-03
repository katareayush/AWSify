import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

interface SetupBannerProps {
  githubDone: boolean;
  awsDone: boolean;
}

interface SetupItem {
  label: string;
  href: string;
  done: boolean;
}

export function SetupBanner({ githubDone, awsDone }: SetupBannerProps) {
  if (githubDone && awsDone) return null;

  const items: SetupItem[] = [
    { label: "Connect GitHub", href: "/onboarding", done: githubDone },
    { label: "Connect AWS", href: "/connections", done: awsDone }
  ];
  const next = items.find((step) => !step.done);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
        <span className="text-white/65">Setup</span>
        {items.map((step) => (
          <SetupChip key={step.label} item={step} />
        ))}
      </div>
      {next && (
        <Link
          href={next.href}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 self-start rounded-md border border-white/[0.1] bg-white/[0.04] px-3 text-[12.5px] text-white/85 transition-colors hover:border-white/[0.18] hover:text-white"
        >
          {next.label}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function SetupChip({ item }: { item: SetupItem }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full border ${
          item.done
            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
            : "border-white/15 text-white/30"
        }`}
      >
        {item.done && <Check className="h-2.5 w-2.5" />}
      </span>
      <span className={item.done ? "text-white/45" : "text-white/80"}>{item.label}</span>
    </div>
  );
}
