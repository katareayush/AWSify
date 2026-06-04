"use client";

import { useEffect } from "react";
import { AppRoot, PageTransition, Sidebar, TopBar } from "./app";
import { SidebarProvider, useSidebar } from "./app/sidebar-context";

interface ProductShellProps {
  children: React.ReactNode;
  active?: string;
}

export function ProductShell({ children, active = "Deployments" }: ProductShellProps) {
  return (
    <AppRoot>
      <SidebarProvider>
        <ShellLayout active={active}>{children}</ShellLayout>
      </SidebarProvider>
    </AppRoot>
  );
}

function ShellLayout({ children, active }: { children: React.ReactNode; active: string }) {
  const { collapsed, toggle } = useSidebar();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  return (
    <div className="min-h-screen">
      <Sidebar active={active} />
      <section
        className={`flex min-h-screen min-w-0 flex-col transition-[padding-left] duration-200 ease-out ${
          collapsed ? "lg:pl-0" : "lg:pl-[260px]"
        }`}
      >
        <TopBar />
        <div className="px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-7xl">
            <PageTransition>{children}</PageTransition>
          </div>
        </div>
      </section>
    </div>
  );
}
