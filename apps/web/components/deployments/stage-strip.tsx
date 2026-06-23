import { Check, CloudOff, FileSearch, Globe, Loader2, Rocket, ShieldCheck, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type StageState = "done" | "active" | "failed" | "pending";

interface Stage {
  label: string;
  icon: LucideIcon;
  state: StageState;
}

interface StageStripProps {
  status: string;
  planStatus?: string | null;
}

function buildStages(status: string, planStatus?: string | null): Stage[] {
  if (status === "destroying" || status === "destroyed") {
    const destroying = status === "destroying";
    return [
      { label: "Deployed", icon: Globe, state: "done" },
      { label: "Teardown", icon: CloudOff, state: destroying ? "active" : "done" },
      { label: "Destroyed", icon: Check, state: destroying ? "pending" : "done" }
    ];
  }

  // Index of the stage the deployment is currently in (or died in).
  let current: number;
  if (status === "deployed") current = 4;
  else if (status === "deploying") current = 2;
  else if (status === "awaiting_approval") current = 1;
  else if (status === "failed") current = !planStatus ? 0 : planStatus === "approved" ? 2 : 1;
  else current = 0; // queued / scanning

  const failed = status === "failed";
  const stateFor = (index: number): StageState => {
    if (index < current) return "done";
    if (index > current) return "pending";
    if (failed) return "failed";
    if (status === "deployed") return "done";
    return "active";
  };

  return [
    { label: "Scan", icon: FileSearch, state: stateFor(0) },
    { label: "Review", icon: ShieldCheck, state: stateFor(1) },
    { label: "Deploy", icon: Rocket, state: stateFor(2) },
    { label: "Live", icon: Globe, state: status === "deployed" ? "done" : stateFor(3) }
  ];
}

const STATE_STYLES: Record<StageState, { dot: string; label: string }> = {
  done: { dot: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300", label: "text-white/70" },
  active: { dot: "border-violet/50 bg-violet/15 text-violet-soft shadow-glow", label: "text-white" },
  failed: { dot: "border-red-500/40 bg-red-500/15 text-red-300", label: "text-red-300" },
  pending: { dot: "border-white/[0.08] bg-white/[0.02] text-white/30", label: "text-white/35" }
};

export function StageStrip({ status, planStatus }: StageStripProps) {
  const stages = buildStages(status, planStatus);
  // Awaiting approval is "active" but waiting on the user, not working — no spinner.
  const spinning = ["queued", "scanning", "deploying", "destroying"].includes(status);

  return (
    <ol className="flex items-center">
      {stages.map((stage, i) => {
        const styles = STATE_STYLES[stage.state];
        const Icon = stage.icon;
        return (
          <li key={stage.label} className={`flex items-center ${i > 0 ? "flex-1" : ""}`}>
            {i > 0 && (
              <div
                className={`mx-2 h-px flex-1 sm:mx-3 ${
                  stage.state === "done" || stages[i - 1].state === "done"
                    ? "bg-emerald-500/25"
                    : "bg-white/[0.07]"
                }`}
              />
            )}
            <div className="flex shrink-0 items-center gap-2">
              <span className={`flex h-7 w-7 items-center justify-center rounded-full border ${styles.dot}`}>
                {stage.state === "done" ? (
                  <Check className="h-3.5 w-3.5" />
                ) : stage.state === "active" && spinning ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : stage.state === "failed" ? (
                  <X className="h-3.5 w-3.5" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
              </span>
              <span className={`hidden text-[12px] font-medium xs:block ${styles.label}`}>{stage.label}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
