import type { LucideIcon } from "lucide-react";
import { CheckCircle2, CircleDashed, Loader2 } from "lucide-react";
import { Panel } from "./ui/panel";

interface SetupStepProps {
  icon: LucideIcon;
  title: string;
  description: string;
  state: "done" | "active" | "pending";
  meta?: string;
}

export function SetupStep({ icon: Icon, title, description, state, meta }: SetupStepProps) {
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03]">
            <Icon className="h-4 w-4 text-violet-soft" />
          </div>
          <div>
            <p className="text-[14px] font-medium tracking-tight text-white">{title}</p>
            <p className="mt-1 text-[13px] leading-[1.55] text-white/55">{description}</p>
            {meta ? (
              <p className="mt-2 font-mono text-[11px] text-white/40">{meta}</p>
            ) : null}
          </div>
        </div>
        <StateIcon state={state} />
      </div>
    </Panel>
  );
}

function StateIcon({ state }: { state: SetupStepProps["state"] }) {
  if (state === "done") {
    return <CheckCircle2 className="h-4 w-4 text-violet-soft" />;
  }
  if (state === "active") {
    return <Loader2 className="h-4 w-4 animate-spin text-violet-soft" />;
  }
  return <CircleDashed className="h-4 w-4 text-white/30" />;
}
