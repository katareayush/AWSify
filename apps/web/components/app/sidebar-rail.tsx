"use client";

import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { navItems } from "./nav-data";
import { useSidebar } from "./sidebar-context";

interface SidebarRailProps {
  active: string;
  onOpenCommandPalette: () => void;
}

export function SidebarRail({ active, onOpenCommandPalette }: SidebarRailProps) {
  const { setCollapsed } = useSidebar();
  return (
    <aside className="z-30 hidden w-14 border-r border-white/[0.06] bg-[#0a0a0d]/95 backdrop-blur-xl lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:flex-col">
      <div className="h-16 border-b border-white/[0.06]" />
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map((item) => {
          const isActive = item.label === active;
          return (
            <Link
              key={item.label}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              className={`group relative flex h-9 items-center justify-center rounded-lg transition-colors ${
                isActive
                  ? "bg-white/[0.06] text-white"
                  : "text-white/55 hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              {isActive ? (
                <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-violet" />
              ) : null}
              <item.icon
                className={`h-4 w-4 ${
                  isActive ? "text-violet-soft" : "text-white/55 group-hover:text-white"
                }`}
              />
            </Link>
          );
        })}
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
