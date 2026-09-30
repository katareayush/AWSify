"use client";

import Link from "next/link";
import { useState } from "react";
import { LogOut, Plus, Search } from "lucide-react";
import { Button } from "../ui/button";
import { Wordmark } from "../landing/primitives/wordmark";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/use-auth";
import { navItems } from "./nav-data";

interface TopBarProps {
  active?: string;
  onOpenCommandPalette: () => void;
}

export function TopBar({ active, onOpenCommandPalette }: TopBarProps) {
  const { me, loading } = useAuth({ redirect: false });
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleConnect() {
    try {
      const { url } = await api.loginUrl();
      window.location.href = url;
    } catch {
      window.location.href = "/";
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await api.logout();
    } catch {
      /* clear client state regardless */
    }
    window.location.href = "/";
  }

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-white/[0.13] bg-[#111210]/95 backdrop-blur-xl">
        <div className="flex h-[72px] items-center justify-between gap-3 px-4 sm:px-8 xl:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="lg:hidden">
              <Wordmark size={16} />
            </Link>
            <div className="hidden items-center gap-2 font-mono text-[11px] uppercase tracking-[0.11em] lg:flex">
              <span className="text-white/35">Workspace</span>
              <span className="text-white/25">/</span>
              <span className="text-white/85">{active ?? "Overview"}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="hidden h-9 items-center gap-2 border border-white/[0.14] bg-[#1b1c19] px-3 text-[12px] text-white/45 transition-colors hover:border-white/[0.28] hover:text-white/75 sm:flex"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Search anything</span>
              <kbd className="ml-4 hidden border-l border-white/[0.12] pl-2 font-mono text-[10px] text-white/45 md:inline">⌘ K</kbd>
            </button>
            <button
              type="button"
              onClick={onOpenCommandPalette}
              aria-label="Open command palette"
              className="flex h-9 w-9 items-center justify-center border border-white/[0.14] bg-[#1b1c19] text-white/45 transition-colors hover:border-white/[0.28] hover:text-white/70 sm:hidden"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
            {loading ? (
              <div className="h-8 w-8 animate-pulse rounded-full border border-white/[0.08] bg-white/[0.04]" />
            ) : me?.authenticated ? (
              <>
                <Button asChild className="hidden sm:inline-flex">
                  <Link href="/repositories">
                    <Plus className="h-4 w-4" />
                    New deploy
                  </Link>
                </Button>
                <Button asChild size="icon" className="sm:hidden" title="New deployment">
                  <Link href="/repositories" aria-label="New deployment">
                    <Plus className="h-4 w-4" />
                  </Link>
                </Button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((open) => !open)}
                    aria-label="Account menu"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    className="flex h-9 w-9 items-center justify-center border border-white/[0.16] bg-[#292a25] text-[12px] font-semibold text-white/80 transition-colors hover:border-white/30 hover:text-white"
                  >
                    {me.githubLogin?.[0]?.toUpperCase() ?? "?"}
                  </button>
                  {menuOpen && (
                    <>
                      <button
                        type="button"
                        aria-hidden
                        tabIndex={-1}
                        onClick={() => setMenuOpen(false)}
                        className="fixed inset-0 z-30 cursor-default"
                      />
                      <div
                        role="menu"
                        className="absolute right-0 top-full z-40 mt-2 w-52 overflow-hidden border border-white/[0.16] bg-[#20211d] py-1 shadow-xl"
                      >
                        <div className="border-b border-white/[0.06] px-3 py-2">
                          <p className="text-[11px] text-white/40">Signed in as</p>
                          <p className="truncate text-[13px] font-medium text-white/85">{me.githubLogin ?? "GitHub user"}</p>
                        </div>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={handleLogout}
                          disabled={loggingOut}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] text-white/65 transition-colors hover:bg-white/[0.05] hover:text-white disabled:opacity-50"
                        >
                          <LogOut className="h-4 w-4 text-white/45" />
                          {loggingOut ? "Logging out…" : "Log out"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <Button variant="secondary" onClick={handleConnect}>
                Connect GitHub
              </Button>
            )}
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-white/[0.1] px-3 py-2 lg:hidden">
          {navItems.map((item) => {
            const isActive = item.label === active;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`inline-flex h-8 shrink-0 items-center gap-1.5 px-3 text-[12px] transition-colors ${
                  isActive
                    ? "bg-[#2a211e] text-white"
                    : "text-white/55 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <item.icon className={`h-3.5 w-3.5 ${isActive ? "text-violet-soft" : "text-white/45"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
    </>
  );
}
