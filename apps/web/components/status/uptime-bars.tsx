export type DayState = "ok" | "degraded" | "down" | "none";

export interface HistoryDay {
  date: string;
  state: DayState;
  total: number;
  failed: number;
}

const BAR_COLORS: Record<DayState, string> = {
  ok: "bg-emerald-400/80 hover:bg-emerald-300",
  degraded: "bg-amber-300/85 hover:bg-amber-200",
  down: "bg-red-400/85 hover:bg-red-300",
  none: "bg-white/[0.08] hover:bg-white/[0.18]"
};

function tooltip(day: HistoryDay): string {
  const date = new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
  if (day.state === "none" && day.total === 0) return `${date} — no deployments`;
  if (day.state === "ok" && day.total === 0) return `${date} — operational`;
  return `${date} — ${day.total} deployment${day.total === 1 ? "" : "s"}, ${day.failed} failed`;
}

export function UptimeBars({ days }: { days: HistoryDay[] }) {
  return (
    <div>
      <div className="flex h-8 items-stretch gap-px sm:gap-[2px]">
        {days.map((day) => (
          <span
            key={day.date}
            title={tooltip(day)}
            className={`min-w-0 flex-1 rounded-[2px] transition-colors ${BAR_COLORS[day.state]}`}
          />
        ))}
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10.5px] text-white/30">
        <span>{days.length} days ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}
