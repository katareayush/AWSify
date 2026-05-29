import type { LucideIcon } from "lucide-react";
import { CheckCircle2, CircleDashed, Loader2 } from "lucide-react";
import { Panel } from "./ui/panel";

export function SetupStep({
  icon: Icon,
  title,
  description,
  state,
  meta
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  state: "done" | "active" | "pending";
  meta?: string;
}) {
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
            {meta ? <p className="mt-2 text-xs text-muted-foreground">{meta}</p> : null}
          </div>
        </div>
        {state === "done" ? <CheckCircle2 className="h-4 w-4 text-primary" /> : null}
        {state === "active" ? <Loader2 className="h-4 w-4 animate-spin text-accent" /> : null}
        {state === "pending" ? <CircleDashed className="h-4 w-4 text-muted-foreground" /> : null}
      </div>
    </Panel>
  );
}
