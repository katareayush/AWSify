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

const STATE_STYLES: Record<StageState, { marker: string; label: string; rail: string }> = {
  done: { marker: "text-emerald-300", label: "text-white/75", rail: "bg-emerald-400" },
  active: { marker: "text-violet-soft", label: "text-white", rail: "bg-violet" },
  failed: { marker: "text-red-300", label: "text-red-300", rail: "bg-red-400" },
  pending: { marker: "text-white/35", label: "text-white/40", rail: "bg-white/[0.12]" }
};

export function StageStrip({ status, planStatus }: StageStripProps) {
  const stages = buildStages(status, planStatus);
  // Awaiting approval is "active" but waiting on the user, not working — no spinner.
  const spinning = ["queued", "scanning", "deploying", "destroying"].includes(status);

  return (
    <ol className={`grid ${stages.length === 3 ? "grid-cols-3" : "grid-cols-4"} border border-white/[0.12] bg-[#151613]`}>
      {stages.map((stage, i) => {
        const styles = STATE_STYLES[stage.state];
        const Icon = stage.icon;
        return (
          <li key={stage.label} className={`relative min-w-0 px-2 py-3 sm:px-4 ${i > 0 ? "border-l border-white/[0.12]" : ""}`}>
            <span className={`absolute inset-x-0 top-0 h-[2px] ${styles.rail}`} />
            <div className="flex items-center gap-2">
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center ${styles.marker}`}>
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
              <span className={`truncate text-[11px] font-medium sm:text-[12px] ${styles.label}`}>{stage.label}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
