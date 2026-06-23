import { Check } from "lucide-react";
import { resourceListItems } from "./data";

export function ResourceList() {
  return (
    <div className="h-full overflow-hidden rounded-xl border border-white/[0.08] bg-[#070708] p-4 sm:rounded-2xl sm:p-6">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10.5px] uppercase tracking-wider text-white/40">
          resources rendered
        </p>
        <span className="font-mono text-[10.5px] text-violet-soft">{resourceListItems.length}</span>
      </div>
      <ul className="mt-5 divide-y divide-white/[0.05]">
        {resourceListItems.map(([label, sub]) => (
          <li key={label} className="flex items-center justify-between gap-3 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Check className="h-3 w-3 shrink-0 text-violet-soft" />
              <span className="truncate text-[13.5px] text-white/85">{label}</span>
            </div>
            <span className="shrink-0 font-mono text-[10.5px] text-white/35">{sub}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
