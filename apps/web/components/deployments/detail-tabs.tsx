"use client";

import type { LucideIcon } from "lucide-react";

export interface DetailTab {
  key: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  pulse?: boolean;
  alert?: boolean;
}

interface DetailTabsProps {
  tabs: DetailTab[];
  active: string;
  onChange: (key: string) => void;
}

export function DetailTabs({ tabs, active, onChange }: DetailTabsProps) {
  return (
    <div className="overflow-x-auto border-b border-white/[0.07]">
      <div className="flex items-center gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={`relative flex shrink-0 items-center gap-2 px-3.5 py-2.5 text-[13px] transition-colors ${
                isActive ? "text-white" : "text-white/45 hover:text-white/80"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? "text-violet-soft" : ""}`} />
              {tab.label}
              {typeof tab.badge === "number" && tab.badge > 0 && (
                <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-1.5 py-px font-mono text-[10px] text-white/55">
                  {tab.badge > 99 ? "99+" : tab.badge}
                </span>
              )}
              {tab.pulse && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-soft opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-soft" />
                </span>
              )}
              {tab.alert && !tab.pulse && <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />}
              {isActive && <span className="absolute inset-x-2 -bottom-px h-px bg-violet-soft" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
