"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Loader2, Maximize2, TerminalSquare, X } from "lucide-react";
import { Panel } from "../ui/panel";
import { useUrlState } from "../../lib/use-url-state";

type LogEntry = { status: string; message: string; at: string };
type LevelFilter = "all" | "info" | "deployed" | "failed";

interface LogsPanelProps {
  logs: LogEntry[];
  isRunning?: boolean;
}

const LEVELS: { key: LevelFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "info", label: "Info" },
  { key: "deployed", label: "Success" },
  { key: "failed", label: "Failed" }
];

function levelOf(status: string): Exclude<LevelFilter, "all"> {
  if (status === "failed") return "failed";
  if (status === "deployed") return "deployed";
  return "info";
}

function levelClass(status: string): string {
  const lvl = levelOf(status);
  if (lvl === "failed") return "text-red-400";
  if (lvl === "deployed") return "text-emerald-400";
  return "text-white/70";
}

export function LogsPanel({ logs, isRunning }: LogsPanelProps) {
  const [filterRaw, setFilterRaw] = useUrlState("logs", "all");
  const filter: LevelFilter = (["all", "info", "deployed", "failed"] as const).includes(filterRaw as LevelFilter)
    ? (filterRaw as LevelFilter)
    : "all";
  const setFilter = (v: LevelFilter) => setFilterRaw(v);
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => (filter === "all" ? logs : logs.filter(l => levelOf(l.status) === filter)),
    [logs, filter]
  );

  // Scroll only the log container — never the page — and only when the
  // user is already at the bottom, so reading old lines isn't interrupted.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (nearBottom || el.scrollTop === 0) el.scrollTop = el.scrollHeight;
  }, [filtered.length]);

  useEffect(() => {
    if (!fullscreen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFullscreen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  async function handleCopy() {
    const text = filtered
      .map(l => `[${new Date(l.at).toISOString()}] ${l.status}: ${l.message}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // swallow — clipboard may be blocked
    }
  }

  const header = (
    <div className="flex flex-wrap items-center gap-2">
      <TerminalSquare className="h-4 w-4 text-violet-soft" />
      <p className="text-[14px] font-medium tracking-tight text-white">Deployment logs</p>
      {isRunning && <Loader2 className="h-3.5 w-3.5 animate-spin text-white/40" />}

      <div className="ml-auto flex items-center gap-1">
        <div className="flex items-center gap-0.5 rounded-md border border-white/[0.08] bg-white/[0.02] p-0.5">
          {LEVELS.map(l => (
            <button
              key={l.key}
              type="button"
              onClick={() => setFilter(l.key)}
              className={`rounded px-2 py-1 text-[11px] transition-colors ${
                filter === l.key
                  ? "bg-white/[0.08] text-white"
                  : "text-white/55 hover:text-white"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <IconButton onClick={handleCopy} title="Copy all logs">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        </IconButton>
        <IconButton onClick={() => setFullscreen(v => !v)} title={fullscreen ? "Exit fullscreen (Esc)" : "Expand to fullscreen"}>
          {fullscreen ? <X className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </IconButton>
      </div>
    </div>
  );

  const body = (
    <div
      ref={bodyRef}
      className={`overflow-y-auto rounded-lg border border-white/[0.06] bg-black/40 p-4 font-mono text-[12px] leading-[1.7] ${
        fullscreen ? "flex-1" : "h-[480px]"
      }`}
    >
      {filtered.length === 0 ? (
        <span className="text-white/30">
          {logs.length === 0 ? "Waiting for logs..." : "No logs match this filter."}
        </span>
      ) : (
        filtered.map((log, i) => (
          <div key={i} className="flex gap-3">
            <span className="shrink-0 text-white/25">{new Date(log.at).toLocaleTimeString()}</span>
            <span className={levelClass(log.status)}>{log.message}</span>
          </div>
        ))
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col gap-3 bg-black/80 p-6 backdrop-blur-sm">
        {header}
        {body}
      </div>
    );
  }

  return (
    <Panel className="p-5">
      <div className="mb-4">{header}</div>
      {body}
    </Panel>
  );
}

function IconButton({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.02] text-white/65 transition-colors hover:bg-white/[0.06] hover:text-white"
    >
      {children}
    </button>
  );
}
