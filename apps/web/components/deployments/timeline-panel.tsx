import { Activity, Check, Loader2 } from "lucide-react";
import { Panel } from "../ui/panel";
import type { DeploymentDetail } from "../../lib/api";

type StepState = "done" | "active" | "failed" | "pending";

interface TimelinePanelProps {
  logs: DeploymentDetail["logs"];
  status: string;
}

export function TimelinePanel({ logs, status }: TimelinePanelProps) {
  const steps = buildTimeline(logs, status);
  return (
    <Panel className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <Activity className="h-4 w-4 text-violet-soft" />
        <p className="text-[13px] font-medium text-white">Progress</p>
      </div>
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li key={step.label} className="flex items-start gap-3">
            <StepMarker state={step.state} isLast={i === steps.length - 1} />
            <div className="min-w-0 flex-1 pb-1">
              <p className={`text-[12.5px] font-medium ${labelTone(step.state)}`}>{step.label}</p>
              <p className="mt-0.5 text-[11.5px] leading-[1.5] text-white/35">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

function labelTone(state: StepState) {
  if (state === "done") return "text-white/80";
  if (state === "active") return "text-white";
  if (state === "failed") return "text-red-300";
  return "text-white/45";
}

function StepMarker({ state, isLast }: { state: StepState; isLast: boolean }) {
  return (
    <div className="relative flex flex-col items-center">
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          state === "done"
            ? "border-emerald-500/40 bg-emerald-500/15"
            : state === "active"
            ? "border-violet/40 bg-violet/15"
            : state === "failed"
            ? "border-red-500/40 bg-red-500/15"
            : "border-white/[0.1] bg-white/[0.03]"
        }`}
      >
        {state === "done" && <Check className="h-3 w-3 text-emerald-400" />}
        {state === "active" && <Loader2 className="h-3 w-3 animate-spin text-violet-soft" />}
        {state === "failed" && <span className="h-1.5 w-1.5 rounded-full bg-red-400" />}
        {state === "pending" && <span className="h-1 w-1 rounded-full bg-white/30" />}
      </div>
      {!isLast && (
        <div className={`mt-1 w-px flex-1 ${state === "done" ? "bg-emerald-500/25" : "bg-white/[0.06]"}`} style={{ minHeight: 16 }} />
      )}
    </div>
  );
}

export function buildTimeline(logs: DeploymentDetail["logs"], status: string): Array<{ label: string; detail: string; state: StepState }> {
  const messages = logs.map((log) => log.message.toLowerCase());
  const has = (needle: string) => messages.some((message) => message.includes(needle));
  const failed = status === "failed";
  const deployed = status === "deployed";

  return [
    {
      label: "Queued",
      detail: "Deployment job created.",
      state: logs.length > 0 ? "done" : "pending"
    },
    {
      label: "Repository scan",
      detail: "Detect runtime, env vars, port, and health path.",
      state: has("scan complete") || has("plan and preview") || deployed ? "done" : status === "scanning" ? "active" : "pending"
    },
    {
      label: "Approval",
      detail: "Review generated artifacts and approve infra.",
      state: status === "awaiting_approval" ? "active" : has("approved plan loaded") || deployed ? "done" : "pending"
    },
    {
      label: "Image build",
      detail: "Build Docker image and push to ECR.",
      state: has("image pushed") || deployed ? "done" : status === "deploying" && has("creating ecr") ? "active" : "pending"
    },
    {
      label: "AWS apply",
      detail: "Run the approved Pulumi ECS Fargate template.",
      state: has("health check") || deployed ? "done" : status === "deploying" && has("running pulumi") ? "active" : "pending"
    },
    {
      label: "Health check",
      detail: "Poll the public ALB URL.",
      state: failed ? "failed" : deployed ? "done" : status === "deploying" && has("checking service health") ? "active" : "pending"
    }
  ];
}
