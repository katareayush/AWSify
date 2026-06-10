import type { LucideIcon } from "lucide-react";

export type StatTone = "emerald" | "violet" | "amber" | "neutral";

export interface StatItem {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: StatTone;
}

const TONES: Record<StatTone, { chip: string; bar: string }> = {
  emerald: { chip: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300", bar: "from-emerald-500/50" },
  violet: { chip: "border-violet/25 bg-violet/10 text-violet-soft", bar: "from-violet/50" },
  amber: { chip: "border-amber-500/25 bg-amber-500/10 text-amber-300", bar: "from-amber-500/50" },
  neutral: { chip: "border-white/[0.08] bg-white/[0.04] text-white/55", bar: "from-white/20" }
};

export function StatStrip({ items }: { items: StatItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Stat key={item.label} item={item} />
      ))}
    </div>
  );
}

function Stat({ item }: { item: StatItem }) {
  const Icon = item.icon;
  const tone = TONES[item.tone ?? "neutral"];
  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/[0.07] bg-gradient-to-b from-white/[0.025] to-transparent px-4 py-4 transition-colors hover:border-white/[0.12]">
      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${tone.bar} to-transparent`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11.5px] tracking-wide text-white/45">{item.label}</p>
          <p className="mt-1.5 font-mono text-[24px] font-medium tracking-tight text-white">{item.value}</p>
          {item.hint && <p className="mt-1 text-[11px] text-white/35">{item.hint}</p>}
        </div>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${tone.chip}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
}
