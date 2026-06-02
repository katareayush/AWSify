"use client";

import Link from "next/link";
import { Mark } from "../landing/primitives/mark";
import { navItems } from "./nav-data";
import { useSidebar } from "./sidebar-context";
import { SidebarToggle } from "./sidebar-toggle";

interface SidebarProps {
  active: string;
}

export function Sidebar({ active }: SidebarProps) {
  const { collapsed } = useSidebar();
  return (
    <aside
      data-collapsed={collapsed}
      className="group/sidebar relative z-10 hidden border-r border-white/[0.06] bg-white/[0.015] backdrop-blur-xl transition-[width] duration-200 ease-out lg:flex lg:flex-col"
    >
      <SidebarBrand collapsed={collapsed} />
      <SidebarNav active={active} collapsed={collapsed} />
      <SidebarFooter collapsed={collapsed} />
    </aside>
  );
}

function SidebarBrand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={`flex h-16 items-center border-b border-white/[0.06] ${collapsed ? "justify-center px-2" : "justify-between px-5"}`}>
      <Link href="/" className="flex items-center gap-2.5 min-w-0" title="AWS-ify">
        <Mark />
        {!collapsed && (
          <div className="leading-tight min-w-0">
            <p className="truncate text-[14px] font-medium tracking-tight text-white">AWS-ify</p>
            <p className="truncate text-[11px] text-white/40">Personal workspace</p>
          </div>
        )}
      </Link>
      {!collapsed && <SidebarToggle />}
    </div>
  );
}

function SidebarNav({ active, collapsed }: { active: string; collapsed: boolean }) {
  return (
    <nav className={`flex-1 space-y-0.5 py-4 ${collapsed ? "px-2" : "px-3"}`}>
      {navItems.map((item) => (
        <SidebarNavItem
          key={item.label}
          item={item}
          active={item.label === active}
          collapsed={collapsed}
        />
      ))}
    </nav>
  );
}

function SidebarNavItem({
  item,
  active,
  collapsed
}: {
  item: (typeof navItems)[number];
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={`group relative flex h-9 items-center rounded-lg text-[13.5px] transition-colors ${
        collapsed ? "justify-center px-0" : "gap-2.5 px-3"
      } ${
        active
          ? "bg-white/[0.06] text-white"
          : "text-white/55 hover:bg-white/[0.03] hover:text-white"
      }`}
    >
      {active ? (
        <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-violet" />
      ) : null}
      <item.icon
        className={`h-4 w-4 shrink-0 transition-colors ${
          active ? "text-violet-soft" : "text-white/45 group-hover:text-white/75"
        }`}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return (
      <div className="border-t border-white/[0.06] p-2">
        <div className="flex items-center justify-center" title="All systems operational">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
        </div>
        <div className="mt-2 flex justify-center">
          <SidebarToggle />
        </div>
      </div>
    );
  }
  return (
    <div className="border-t border-white/[0.06] p-4">
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
        <p className="font-mono text-[10px] uppercase tracking-wider text-white/35">
          status
        </p>
        <div className="mt-2 flex items-center gap-2 text-[12px] text-white/70">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          All systems operational
        </div>
      </div>
    </div>
  );
}
