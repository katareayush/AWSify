"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { navItems } from "./nav-data";
import { api, type Repo } from "../../lib/api";

interface CommandItem {
  key: string;
  label: string;
  hint?: string;
  href: string;
  icon?: React.ReactNode;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [repos, setRepos] = useState<Repo[]>([]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (!open || repos.length > 0) return;
    api.repositories().then((r) => setRepos(r.repositories ?? [])).catch(() => {});
  }, [open, repos.length]);

  const items = useMemo<CommandItem[]>(() => {
    const navResults: CommandItem[] = navItems.map((n) => ({
      key: `nav:${n.label}`,
      label: n.label,
      hint: "Page",
      href: n.href,
      icon: <n.icon className="h-4 w-4 text-white/60" />
    }));
    const repoResults: CommandItem[] = repos.map((r) => ({
      key: `repo:${r.id}`,
      label: r.fullName,
      hint: r.defaultBranch,
      href: `/repositories?focus=${encodeURIComponent(r.fullName)}`,
      icon: <span className="text-[10px] font-mono text-white/45">repo</span>
    }));
    const all = [...navResults, ...repoResults];
    if (!query.trim()) return all.slice(0, 12);
    const q = query.toLowerCase();
    return all.filter((i) => i.label.toLowerCase().includes(q) || i.hint?.toLowerCase().includes(q)).slice(0, 16);
  }, [query, repos]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  if (!open) return null;

  function go(item: CommandItem) {
    router.push(item.href);
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[active];
      if (item) go(item);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-palette-fade" />
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0d] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] animate-palette-in"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-3.5">
          <Search className="h-4 w-4 text-white/45" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages, repositories…"
            className="h-12 w-full bg-transparent text-[14px] text-white placeholder:text-white/35 focus:outline-none"
          />
          <kbd className="hidden rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-white/45 sm:inline-block">
            esc
          </kbd>
        </div>
        <ul className="max-h-[55vh] overflow-y-auto py-1.5">
          {items.length === 0 ? (
            <li className="px-4 py-6 text-center text-[13px] text-white/45">No matches</li>
          ) : (
            items.map((item, i) => (
              <li key={item.key}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item)}
                  className={`flex w-full items-center gap-3 px-3.5 py-2 text-left text-[13.5px] transition-colors ${
                    i === active ? "bg-white/[0.06] text-white" : "text-white/75"
                  }`}
                >
                  <span className="flex h-6 w-6 items-center justify-center">{item.icon}</span>
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.hint ? (
                    <span className="text-[11px] text-white/40">{item.hint}</span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
