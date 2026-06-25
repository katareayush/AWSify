"use client";

import { useCallback, useEffect, useState } from "react";
import { AppRoot, CommandPalette, PageTransition, Sidebar, TopBar } from "./app";
import { useSidebar } from "./app/sidebar-context";

interface ProductShellProps {
  children: React.ReactNode;
  active?: string;
}

// SidebarProvider lives in the root layout so its state survives the per-page
// re-mount of this shell — that's what prevents the collapse/expand flash.
export function ProductShell({ children, active = "Deployments" }: ProductShellProps) {
  return (
    <AppRoot>
      <ShellLayout active={active}>{children}</ShellLayout>
    </AppRoot>
  );
}

function ShellLayout({ children, active }: { children: React.ReactNode; active: string }) {
  const { collapsed, toggle } = useSidebar();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        toggle();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  return (
    <div className="min-h-screen">
      <Sidebar active={active} onOpenCommandPalette={openPalette} />
      <section
        className={`flex min-h-screen min-w-0 flex-col transition-[padding-left] duration-200 ease-out ${
          collapsed ? "lg:pl-14" : "lg:pl-[260px]"
        }`}
      >
        <TopBar active={active} onOpenCommandPalette={openPalette} />
        <div className="px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-7xl">
            <PageTransition>{children}</PageTransition>
          </div>
        </div>
      </section>
      <CommandPalette open={paletteOpen} onClose={closePalette} />
    </div>
  );
}
