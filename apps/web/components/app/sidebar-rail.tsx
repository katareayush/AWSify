"use client";

import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { navGroups } from "./nav-data";
import { useSidebar } from "./sidebar-context";

interface SidebarRailProps {
  active: string;
  onOpenCommandPalette: () => void;
}

export function SidebarRail({ active, onOpenCommandPalette }: SidebarRailProps) {
  const { setCollapsed } = useSidebar();
  return (
    <aside className="z-30 hidden w-14 border-r border-white/[0.06] bg-[#0a0a0d]/95 backdrop-blur-xl lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:flex-col">
      <div className="flex h-16 items-center justify-center border-b border-white/[0.06]">
        <Link
          href="/"
          title="AWS-ify"
          aria-label="AWS-ify home"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet/25 bg-violet/10 text-[13px] font-semibold text-violet-soft transition-colors hover:border-violet/40 hover:text-white"
        >
          A
        </Link>
      </div>
      <nav className="flex-1 px-2 py-4">
        {navGroups.map((group, index) => (
          <div key={group.label} className={index > 0 ? "mt-6" : ""}>
            {/* Same height as the expanded sidebar's group label so icons
                don't jump vertically when collapsing/expanding. */}
            <div className="flex h-[23px] items-center justify-center" aria-hidden>
              <span className="h-px w-4 bg-white/[0.08]" />
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = item.label === active;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    title={item.label}
                    aria-label={item.label}
                    className={`group relative flex h-9 items-center justify-center rounded-lg transition-colors ${
                      isActive
                        ? "bg-gradient-to-r from-violet/[0.14] to-white/[0.03] text-white"
                        : "text-white/55 hover:bg-white/[0.04] hover:text-white"
                    }`}
                  >
                    {isActive ? (
                      <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-violet shadow-[0_0_8px_rgba(139,92,246,0.7)]" />
                    ) : null}
                    <item.icon
                      className={`h-4 w-4 ${
                        isActive ? "text-violet-soft" : "text-white/55 group-hover:text-white"
                      }`}
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/[0.06] px-2 py-3">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          aria-label="Open command palette"
          title="Command palette (⌘ K)"
          className="flex h-9 w-full items-center justify-center rounded-lg text-white/55 transition-colors hover:bg-white/[0.04] hover:text-white"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-label="Expand sidebar"
        title="Expand sidebar (⌘\\)"
        className="group absolute inset-y-0 -right-1 flex w-2 items-center justify-center hover:bg-white/[0.06]"
      >
        <ChevronRight className="h-3 w-3 text-white/0 transition-colors group-hover:text-white/50" />
      </button>
    </aside>
  );
}
