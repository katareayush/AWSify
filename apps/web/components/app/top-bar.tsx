"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Button } from "../ui/button";
import { Wordmark } from "../landing/primitives/wordmark";
import { api, type Me } from "../../lib/api";
import { CommandPalette } from "./command-palette";

export function TopBar() {
  const [me, setMe] = useState<Me | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    api.me().then(setMe).catch(() => {});
  }, []);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function handleConnect() {
    try {
      const { url } = await api.loginUrl();
      window.location.href = url;
    } catch {
      window.location.href = "/";
    }
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/[0.06] bg-black/40 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/" className="lg:hidden">
          <Wordmark size={16} />
        </Link>
        <button
          type="button"
          onClick={openPalette}
          className="hidden h-9 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 text-[13px] text-white/45 transition-colors hover:border-white/[0.14] hover:text-white/70 sm:flex"
        >
          <Search className="h-3.5 w-3.5" />
          Search AWS-ify
          <kbd className="ml-3 rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-white/45">⌘ K</kbd>
        </button>
        <button
          type="button"
          onClick={openPalette}
          aria-label="Open command palette"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.02] text-white/45 transition-colors hover:border-white/[0.14] hover:text-white/70 sm:hidden"
        >
          <Search className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {me?.authenticated ? (
          <>
            <Button asChild variant="secondary">
              <Link href="/repositories">
                <Plus className="h-4 w-4" />
                New deploy
              </Link>
            </Button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.06] text-[12px] font-medium text-white/80">
              {me.githubLogin?.[0]?.toUpperCase() ?? "?"}
            </div>
          </>
        ) : (
          <Button variant="secondary" onClick={handleConnect}>
            Connect GitHub
          </Button>
        )}
      </div>
      <CommandPalette open={paletteOpen} onClose={closePalette} />
    </header>
  );
}
