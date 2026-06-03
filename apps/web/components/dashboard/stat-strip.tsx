import type { LucideIcon } from "lucide-react";

export interface StatItem {
  icon: LucideIcon;
  label: string;
  value: string;
}

export function StatStrip({ items }: { items: StatItem[] }) {
  return (
    <div className="grid divide-x divide-white/[0.05] rounded-xl border border-white/[0.06] sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Stat key={item.label} item={item} />
      ))}
    </div>
  );
}

function Stat({ item }: { item: StatItem }) {
  const Icon = item.icon;
  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-2 text-white/40">
        <Icon className="h-3 w-3" />
        <span className="text-[11px] tracking-wide">{item.label}</span>
      </div>
      <p className="mt-2 text-[20px] font-medium tracking-tight text-white">{item.value}</p>
    </div>
  );
}
