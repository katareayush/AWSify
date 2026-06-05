import { Boxes } from "lucide-react";
import { Panel } from "../ui/panel";

interface Resource {
  type: string;
  name: string;
  purpose: string;
}

interface PlanInfoPanelProps {
  suggestion?: Record<string, unknown> | null;
  resources?: Resource[];
  estimatedCost?: { low: number; high: number; notes: string[] } | null;
}

export function PlanInfoPanel({ suggestion, resources, estimatedCost }: PlanInfoPanelProps) {
  if (!suggestion && (!resources || resources.length === 0) && !estimatedCost) return null;

  const facts: Array<{ label: string; value: string }> = [];
  if (suggestion?.appType) facts.push({ label: "App type", value: String(suggestion.appType) });
  if (suggestion?.computeTarget) facts.push({ label: "Compute", value: String(suggestion.computeTarget) });
  if (suggestion?.packageManager) facts.push({ label: "Package", value: String(suggestion.packageManager) });
  if (suggestion?.nodeVersion) facts.push({ label: "Node", value: String(suggestion.nodeVersion) });
  if (suggestion?.port) facts.push({ label: "Port", value: String(suggestion.port) });
  if (suggestion?.healthPath) facts.push({ label: "Health", value: String(suggestion.healthPath) });

  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-white/[0.05] px-5 py-3">
        <Boxes className="h-4 w-4 text-violet-soft" />
        <p className="text-[13px] font-medium text-white">Plan</p>
      </div>

      {facts.length > 0 && (
        <div className="grid grid-cols-2 gap-px bg-white/[0.04]">
          {facts.map((fact) => (
            <div key={fact.label} className="min-w-0 bg-[#0a0a0d] px-4 py-2.5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/35">{fact.label}</p>
              <p className="mt-0.5 truncate font-mono text-[12px] text-white/80" title={fact.value}>{fact.value}</p>
            </div>
          ))}
        </div>
      )}

      {estimatedCost && (
        <div className="border-t border-white/[0.05] px-5 py-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/35">Cost estimate</p>
            <p className="font-mono text-[18px] font-medium text-white">
              ${estimatedCost.low}–${estimatedCost.high}
              <span className="ml-1 text-[12px] font-normal text-white/40">/mo</span>
            </p>
          </div>
          {estimatedCost.notes.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {estimatedCost.notes.map((note, i) => (
                <li key={i} className="text-[11.5px] leading-[1.55] text-white/40">— {note}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {resources && resources.length > 0 && (
        <div className="border-t border-white/[0.05] px-5 py-4">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/35">Resources</p>
            <span className="font-mono text-[11px] text-white/45">{resources.length}</span>
          </div>
          <div className="space-y-2">
            {resources.map((r, i) => (
              <div key={i} className="min-w-0">
                <p className="truncate font-mono text-[12px] text-white/75" title={r.name}>{r.name}</p>
                <p className="truncate text-[11px] text-white/35" title={`${r.type} — ${r.purpose}`}>
                  {r.type} — {r.purpose}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}
