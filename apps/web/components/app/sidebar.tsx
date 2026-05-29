import Link from "next/link";
import { Mark } from "../landing/primitives/mark";
import { navItems } from "./nav-data";

interface SidebarProps {
  active: string;
}

export function Sidebar({ active }: SidebarProps) {
  return (
    <aside className="relative z-10 hidden border-r border-white/[0.06] bg-white/[0.015] backdrop-blur-xl lg:flex lg:flex-col">
      <SidebarBrand />
      <SidebarNav active={active} />
      <SidebarFooter />
    </aside>
  );
}

function SidebarBrand() {
  return (
    <Link
      href="/"
      className="flex h-16 items-center gap-2.5 border-b border-white/[0.06] px-5"
    >
      <Mark />
      <div className="leading-tight">
        <p className="text-[14px] font-medium tracking-tight text-white">AWS-ify</p>
        <p className="text-[11px] text-white/40">Personal workspace</p>
      </div>
    </Link>
  );
}

function SidebarNav({ active }: { active: string }) {
  return (
    <nav className="flex-1 space-y-0.5 px-3 py-4">
      {navItems.map((item) => (
        <SidebarNavItem
          key={item.label}
          item={item}
          active={item.label === active}
        />
      ))}
    </nav>
  );
}

function SidebarNavItem({ item, active }: { item: (typeof navItems)[number]; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={`group relative flex h-9 items-center gap-2.5 rounded-lg px-3 text-[13.5px] transition-colors ${
        active
          ? "bg-white/[0.06] text-white"
          : "text-white/55 hover:bg-white/[0.03] hover:text-white"
      }`}
    >
      {active ? (
        <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-violet" />
      ) : null}
      <item.icon
        className={`h-4 w-4 transition-colors ${
          active ? "text-violet-soft" : "text-white/45 group-hover:text-white/75"
        }`}
      />
      {item.label}
    </Link>
  );
}

function SidebarFooter() {
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
