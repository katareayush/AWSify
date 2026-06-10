"use client";

import Link from "next/link";
import { Activity, PanelLeftClose, Search } from "lucide-react";
import { Wordmark } from "../landing/primitives/wordmark";
import { navGroups, type NavItem } from "./nav-data";
import { useSidebar } from "./sidebar-context";
import { SidebarRail } from "./sidebar-rail";

interface SidebarProps {
  active: string;
  onOpenCommandPalette: () => void;
}

export function Sidebar({ active, onOpenCommandPalette }: SidebarProps) {
  const { collapsed } = useSidebar();
  if (collapsed) return <SidebarRail active={active} onOpenCommandPalette={onOpenCommandPalette} />;
  return (
    <aside className="z-30 hidden w-[260px] border-r border-white/[0.06] bg-[#0a0a0d]/95 backdrop-blur-xl lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:flex-col">
      <SidebarBrand />
      <SidebarNav active={active} />
      <SidebarFooter onOpenCommandPalette={onOpenCommandPalette} />
    </aside>
  );
}

function SidebarBrand() {
  const { setCollapsed } = useSidebar();
  return (
    <div className="flex h-16 items-center justify-between gap-2 border-b border-white/[0.06] pl-5 pr-3">
      <Link href="/" className="flex min-w-0 items-center" title="AWS-ify">
        <div className="min-w-0 leading-tight">
          <Wordmark size={17} />
        </div>
      </Link>
      <button
        type="button"
        onClick={() => setCollapsed(true)}
        aria-label="Collapse sidebar"
        title="Collapse sidebar (⌘\\)"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white"
      >
        <PanelLeftClose className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function SidebarNav({ active }: { active: string }) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      {navGroups.map((group, index) => (
        <div key={group.label} className={index > 0 ? "mt-6" : ""}>
          <p className="px-3 pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/30">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <SidebarNavItem key={item.label} item={item} active={item.label === active} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarNavItem({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`group relative flex h-9 items-center gap-2.5 rounded-lg px-3 text-[13px] font-medium transition-colors ${
        active
          ? "bg-gradient-to-r from-violet/[0.14] to-white/[0.03] text-white"
          : "text-white/55 hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      {active ? (
        <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-violet shadow-[0_0_8px_rgba(139,92,246,0.7)]" />
      ) : null}
      <item.icon
        className={`h-4 w-4 shrink-0 transition-colors ${
          active ? "text-violet-soft" : "text-white/40 group-hover:text-white/75"
        }`}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function SidebarFooter({ onOpenCommandPalette }: { onOpenCommandPalette: () => void }) {
  return (
    <div className="space-y-0.5 border-t border-white/[0.06] p-3">
      <button
        type="button"
        onClick={onOpenCommandPalette}
        className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-left text-[13px] text-white/55 transition-colors hover:bg-white/[0.04] hover:text-white"
      >
        <Search className="h-4 w-4 shrink-0 text-white/40" />
        <span className="flex-1">Search</span>
        <kbd className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-white/50">⌘K</kbd>
      </button>
      <Link
        href="/status"
        className="flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-[13px] text-white/55 transition-colors hover:bg-white/[0.04] hover:text-white"
      >
        <Activity className="h-4 w-4 shrink-0 text-white/40" />
        <span className="flex-1">System status</span>
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
      </Link>
    </div>
  );
}
