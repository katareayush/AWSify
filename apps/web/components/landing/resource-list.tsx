import { Check } from "lucide-react";
import { resourceListItems } from "./data";

export function ResourceList() {
  return (
    <div className="h-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#070708] p-6">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10.5px] uppercase tracking-wider text-white/40">
          resources rendered
        </p>
        <span className="font-mono text-[10.5px] text-violet-soft">{resourceListItems.length}</span>
      </div>
      <ul className="mt-5 divide-y divide-white/[0.05]">
        {resourceListItems.map(([label, sub]) => (
          <li key={label} className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2.5">
              <Check className="h-3 w-3 text-violet-soft" />
              <span className="text-[13.5px] text-white/85">{label}</span>
            </div>
            <span className="font-mono text-[10.5px] text-white/35">{sub}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
