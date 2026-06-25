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
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-black/40 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="lg:hidden">
              <Wordmark size={16} />
            </Link>
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="hidden h-9 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 text-[13px] text-white/45 transition-colors hover:border-white/[0.14] hover:text-white/70 sm:flex"
            >
              <Search className="h-3.5 w-3.5" />
              Search AWS-ify
              <kbd className="ml-3 rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-white/45">⌘ K</kbd>
            </button>
            <button
              type="button"
              onClick={onOpenCommandPalette}
              aria-label="Open command palette"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.02] text-white/45 transition-colors hover:border-white/[0.14] hover:text-white/70 sm:hidden"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {loading ? (
              <div className="h-8 w-8 animate-pulse rounded-full border border-white/[0.08] bg-white/[0.04]" />
            ) : me?.authenticated ? (
              <>
                <Button asChild variant="secondary" className="hidden sm:inline-flex">
                  <Link href="/repositories">
                    <Plus className="h-4 w-4" />
                    New deploy
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="icon" className="sm:hidden" title="New deployment">
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
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.06] text-[12px] font-medium text-white/80 transition-colors hover:border-white/25 hover:text-white"
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
                        className="absolute right-0 top-full z-40 mt-2 w-52 overflow-hidden rounded-lg border border-white/[0.08] bg-[#0a0a0d]/95 py-1 shadow-xl backdrop-blur-xl"
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
        <nav className="flex gap-1 overflow-x-auto border-t border-white/[0.05] px-3 py-2 lg:hidden">
          {navItems.map((item) => {
            const isActive = item.label === active;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-[12px] transition-colors ${
                  isActive
                    ? "bg-white/[0.08] text-white"
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
