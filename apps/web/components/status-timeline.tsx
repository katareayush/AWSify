import { CheckCircle2, CircleDashed, Loader2 } from "lucide-react";

const steps = [
  { label: "GitHub app installed", state: "done" },
  { label: "AWS role validated", state: "done" },
  { label: "Repository scanned", state: "done" },
  { label: "Review generated plan", state: "active" },
  { label: "Deploy ECS service", state: "pending" }
];

export function StatusTimeline() {
  return (
    <div className="space-y-3">
      {steps.map((step) => (
        <div key={step.label} className="flex items-center gap-3 text-sm">
          {step.state === "done" ? <CheckCircle2 className="h-4 w-4 text-primary" /> : null}
          {step.state === "active" ? <Loader2 className="h-4 w-4 animate-spin text-accent" /> : null}
          {step.state === "pending" ? <CircleDashed className="h-4 w-4 text-muted-foreground" /> : null}
          <span className={step.state === "pending" ? "text-muted-foreground" : "text-foreground"}>{step.label}</span>
        </div>
      ))}
    </div>
  );
}
