import type { LucideIcon } from "lucide-react";

export type StatTone = "emerald" | "violet" | "amber" | "neutral";

export interface StatItem {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: StatTone;
}

const TONE: Record<StatTone, string> = {
  emerald: "text-emerald-300",
  violet: "text-violet-soft",
  amber: "text-amber-300",
  neutral: "text-white/55"
};

export function StatStrip({ items }: { items: StatItem[] }) {
  return (
    <div className="grid grid-cols-2 border border-white/[0.14] bg-[#181916] lg:grid-cols-4">
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className={`min-w-0 p-4 sm:p-5 ${index % 2 ? "border-l border-white/[0.13]" : ""} ${index > 1 ? "border-t border-white/[0.13] lg:border-t-0" : ""} ${index === 2 ? "lg:border-l" : ""}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.13em] text-white/50">{item.label}</p>
              <Icon className={`h-4 w-4 shrink-0 ${TONE[item.tone ?? "neutral"]}`} />
            </div>
            <p className="mt-5 text-[36px] font-semibold leading-none tracking-[-0.065em] text-white sm:text-[42px]">{item.value}</p>
            {item.hint && <p className="mt-2 truncate text-[11px] text-white/38">{item.hint}</p>}
          </div>
        );
      })}
    </div>
  );
}
