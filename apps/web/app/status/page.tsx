"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { Backdrop } from "../../components/landing/backdrop";
import { Wordmark } from "../../components/landing/primitives/wordmark";
import { UptimeBars, type HistoryDay } from "../../components/status/uptime-bars";
import { relativeTime } from "../../lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
if (!API_BASE) throw new Error("NEXT_PUBLIC_API_URL is required.");

const REFRESH_MS = 30_000;

interface ServiceHistory {
  name: string;
  uptime: number;
  days: HistoryDay[];
}

interface PublicStatus {
  state: string;
  checkedAt: string;
  services: Array<{ name: string; state: string }>;
  recent: { active: number; deployed: number; failed: number; total: number; failureRate: number };
  history?: ServiceHistory[];
}

type Tone = "ok" | "warn" | "down";

function toneOf(state: string): Tone {
  const s = state.toLowerCase();
  if (["operational", "ok", "healthy", "up"].includes(s)) return "ok";
  if (["unreachable", "down", "failed", "outage"].includes(s)) return "down";
  return "warn";
}

const TONE = {
  ok: { dot: "bg-emerald-400", text: "text-emerald-300", glow: "bg-emerald-500/[0.08]", border: "border-emerald-500/20" },
  warn: { dot: "bg-amber-300", text: "text-amber-300", glow: "bg-amber-500/[0.07]", border: "border-amber-500/20" },
  down: { dot: "bg-red-400", text: "text-red-300", glow: "bg-red-500/[0.07]", border: "border-red-500/25" }
} as const;

function label(state: string) {
  return state.charAt(0).toUpperCase() + state.slice(1).replace(/_/g, " ");
}

export default function StatusPage() {
  const [status, setStatus] = useState<PublicStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    try {
      const response = await fetch(`${API_BASE}/health/public-status`);
      setStatus(await response.json());
    } catch {
      setStatus({
        state: "degraded",
        checkedAt: new Date().toISOString(),
        services: [{ name: "API", state: "unreachable" }],
        recent: { active: 0, deployed: 0, failed: 0, total: 0, failureRate: 0 },
        history: []
      });
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  const tone = TONE[status ? toneOf(status.state) : "warn"];

  return (
    <main className="min-h-screen bg-[#050508] text-white">
      <Backdrop />
      <section className="relative mx-auto max-w-3xl px-5 py-14 sm:py-20">
        <div className="flex items-center justify-between">
          <Wordmark size={16} />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[12.5px] text-white/45 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to AWS-ify
          </Link>
        </div>

        <div className="mt-12">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-violet-soft">Public status</p>
          <h1 className="mt-3 text-[32px] font-medium tracking-tight sm:text-[38px]">System status</h1>
        </div>

        <div className={`relative mt-8 overflow-hidden rounded-xl border ${status ? tone.border : "border-white/[0.08]"} bg-gradient-to-b from-white/[0.03] to-white/[0.01]`}>
          <div aria-hidden className={`pointer-events-none absolute -top-20 left-1/2 h-40 w-[120%] -translate-x-1/2 rounded-full blur-[70px] ${tone.glow}`} />

          <div className="relative flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            {!status ? (
              <div className="flex items-center gap-2.5 text-white/45">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-[13.5px]">Checking system status…</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-50 ${tone.dot}`} />
                    <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${tone.dot}`} />
                  </span>
                  <p className="text-[16px] font-medium tracking-tight">
                    {toneOf(status.state) === "ok" ? "All systems operational" : "Some systems degraded"}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[12px] text-white/40">
                  <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
                  Checked {relativeTime(status.checkedAt)} · refreshes every 30s
                </div>
              </>
            )}
          </div>

          {status && (
            <div className="relative divide-y divide-white/[0.05] border-t border-white/[0.06]">
              {status.services.map((service) => {
                const serviceTone = TONE[toneOf(service.state)];
                const history = status.history?.find((entry) => entry.name === service.name);
                return (
                  <div key={service.name} className="px-5 py-4 sm:px-6">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[13.5px] font-medium text-white/85">{service.name}</span>
                      <div className="flex items-center gap-3">
                        {history && (
                          <span className="font-mono text-[11.5px] text-white/40">
                            {history.uptime}% uptime
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-2 text-[12.5px] font-medium ${serviceTone.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${serviceTone.dot}`} />
                          {label(service.state)}
                        </span>
                      </div>
                    </div>
                    {history && history.days.length > 0 && (
                      <div className="mt-3">
                        <UptimeBars days={history.days} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {status && status.history && status.history.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-end gap-x-4 gap-y-1.5 text-[11px] text-white/40">
            <LegendSwatch className="bg-emerald-400/80" label="Operational" />
            <LegendSwatch className="bg-amber-300/85" label="Degraded" />
            <LegendSwatch className="bg-red-400/85" label="Outage" />
            <LegendSwatch className="bg-white/[0.12]" label="No data" />
          </div>
        )}

        {status && (
          <>
            <p className="mt-10 font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/35">
              Last 24 hours
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <Metric label="Active" value={status.recent.active} accent="from-violet/50" />
              <Metric label="Live" value={status.recent.deployed} accent="from-emerald-500/50" />
              <Metric label="Failed" value={status.recent.failed} accent={status.recent.failed > 0 ? "from-red-500/50" : "from-white/20"} />
              <Metric label="Total" value={status.recent.total} accent="from-white/20" />
              <Metric
                label="Failure rate"
                value={`${status.recent.failureRate}%`}
                accent={status.recent.failureRate > 25 ? "from-amber-500/50" : "from-white/20"}
              />
            </div>
          </>
        )}

        <p className="mt-12 text-center text-[11.5px] text-white/30">
          Having trouble? Check your AWS connection on the{" "}
          <Link href="/connections" className="text-white/50 underline-offset-2 hover:text-white hover:underline">
            connections page
          </Link>
          .
        </p>
      </section>
    </main>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-[2px] ${className}`} />
      {label}
    </span>
  );
}

function Metric({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/[0.07] bg-gradient-to-b from-white/[0.02] to-transparent px-4 py-3.5">
      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${accent} to-transparent`} />
      <p className="font-mono text-[20px] font-medium tracking-tight text-white">{value}</p>
      <p className="mt-0.5 text-[11px] text-white/40">{label}</p>
    </div>
  );
}
