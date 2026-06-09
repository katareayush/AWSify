import { AlertTriangle, DollarSign, KeyRound, ShieldCheck } from "lucide-react";
import { Panel } from "../ui/panel";

interface Resource {
  type: string;
  name: string;
  purpose: string;
}

interface SafetyReviewPanelProps {
  resources?: Resource[];
  estimatedCost?: { low: number; high: number; notes: string[] } | null;
  region?: string;
}

const IAM_SCOPE = [
  "Assume the connected deployment role only with this workspace external ID.",
  "Create and update ECS Fargate services, task roles, ALB routing, ECR images, CloudWatch logs, and scoped security groups.",
  "Read rollout state needed to verify ECS deployment status and health checks."
];

export function SafetyReviewPanel({ resources = [], estimatedCost, region }: SafetyReviewPanelProps) {
  const deletes = resources.filter((resource) => resource.type.toLowerCase().includes("delete"));
  const planned = resources.filter((resource) => !resource.type.toLowerCase().includes("delete"));

  return (
    <Panel className="overflow-hidden border-amber-500/20 bg-amber-500/[0.025]">
      <div className="flex items-center gap-2 border-b border-amber-500/10 px-5 py-3">
        <ShieldCheck className="h-4 w-4 text-amber-300" />
        <p className="text-[13px] font-medium text-white">Approval safety review</p>
        {region && <span className="ml-auto font-mono text-[10.5px] text-white/40">{region}</span>}
      </div>

      <div className="grid gap-px bg-amber-500/10 lg:grid-cols-3">
        <ImpactColumn
          title="AWSify will create/update"
          count={planned.length}
          tone="ok"
          items={planned.slice(0, 5).map((resource) => ({
            primary: resource.name,
            secondary: `${resource.type} · ${resource.purpose}`
          }))}
          empty="No resource changes in the current plan."
        />
        <ImpactColumn
          title="AWSify will delete"
          count={deletes.length}
          tone={deletes.length > 0 ? "danger" : "muted"}
          items={deletes.map((resource) => ({
            primary: resource.name,
            secondary: `${resource.type} · ${resource.purpose}`
          }))}
          empty="No deletes detected from this plan."
        />
        <div className="bg-[#0a0a0d] px-5 py-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-3.5 w-3.5 text-white/45" />
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/35">Cost impact</p>
          </div>
          {estimatedCost ? (
            <>
              <p className="mt-2 font-mono text-[22px] font-medium text-white">
                ${estimatedCost.low}-{estimatedCost.high}
                <span className="ml-1 text-[12px] font-normal text-white/40">/mo</span>
              </p>
              {estimatedCost.notes.length > 0 && (
                <p className="mt-2 text-[11.5px] leading-[1.5] text-white/40">{estimatedCost.notes[0]}</p>
              )}
            </>
          ) : (
            <p className="mt-2 text-[12px] text-white/40">Cost estimate unavailable until the plan is ready.</p>
          )}
        </div>
      </div>

      <div className="border-t border-amber-500/10 px-5 py-4">
        <div className="mb-2 flex items-center gap-2">
          <KeyRound className="h-3.5 w-3.5 text-white/45" />
          <p className="font-mono text-[10px] uppercase tracking-wider text-white/35">IAM role scope</p>
        </div>
        <ul className="grid gap-2 lg:grid-cols-3">
          {IAM_SCOPE.map((item) => (
            <li key={item} className="rounded-md border border-white/[0.06] bg-white/[0.018] px-3 py-2 text-[11.5px] leading-[1.5] text-white/50">
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-500/15 bg-amber-500/[0.05] px-3 py-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
          <p className="text-[11.5px] leading-[1.5] text-amber-100/65">
            Approval allows AWSify to apply this plan using your connected role. Review deletes, cost, and generated files before continuing.
          </p>
        </div>
      </div>
    </Panel>
  );
}

function ImpactColumn({
  title,
  count,
  tone,
  items,
  empty
}: {
  title: string;
  count: number;
  tone: "ok" | "danger" | "muted";
  items: Array<{ primary: string; secondary: string }>;
  empty: string;
}) {
  const toneClass =
    tone === "danger" ? "text-red-300" : tone === "ok" ? "text-emerald-300" : "text-white/35";

  return (
    <div className="min-w-0 bg-[#0a0a0d] px-5 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-wider text-white/35">{title}</p>
        <span className={`font-mono text-[11px] ${toneClass}`}>{count}</span>
      </div>
      {items.length > 0 ? (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div key={`${item.primary}:${item.secondary}`} className="min-w-0">
              <p className="truncate font-mono text-[12px] text-white/75" title={item.primary}>{item.primary}</p>
              <p className="truncate text-[11px] text-white/35" title={item.secondary}>{item.secondary}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-[12px] text-white/38">{empty}</p>
      )}
    </div>
  );
}
