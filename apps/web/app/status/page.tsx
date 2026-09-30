"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
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
  ok: { dot: "bg-emerald-400", text: "text-emerald-300", border: "border-emerald-500/25" },
  warn: { dot: "bg-amber-300", text: "text-amber-300", border: "border-amber-500/25" },
  down: { dot: "bg-red-400", text: "text-red-300", border: "border-red-500/25" }
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
      if (!response.ok) throw new Error(`Status check failed: HTTP ${response.status}`);
      const data = await response.json();
      if (!isPublicStatus(data)) throw new Error("Status response was malformed.");
      setStatus(data);
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
    <main className="min-h-screen bg-[#111210] text-white">
      <section className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="flex items-center justify-between border-b border-white/[0.14] pb-7">
          <Wordmark size={16} />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[12.5px] text-white/45 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to AWS-ify
          </Link>
        </div>

        <div className="mt-16 border-b border-white/[0.14] pb-8">
          <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-soft"><span className="h-1.5 w-1.5 bg-violet" />Public status / AWS-ify</p>
          <h1 className="mt-4 text-[40px] font-semibold leading-none tracking-[-0.055em] sm:text-[56px]">System status<span className="text-violet">.</span></h1>
          <p className="mt-3 text-[13px] text-white/50">Live health for the services that power deployments.</p>
        </div>

        <div className={`mt-8 overflow-hidden border ${status ? tone.border : "border-white/[0.14]"} bg-[#181916]`}>

          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            {!status ? (
              <div className="flex items-center gap-2.5 text-white/45">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-[13.5px]">Checking system status…</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 ${tone.dot}`} />
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
            <div className="divide-y divide-white/[0.1] border-t border-white/[0.13]">
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
            <p className="mt-12 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
              Last 24 hours
            </p>
            <div className="mt-3 grid grid-cols-2 gap-px border border-white/[0.14] bg-white/[0.14] sm:grid-cols-5">
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

function isPublicStatus(value: unknown): value is PublicStatus {
  if (!value || typeof value !== "object") return false;
  const status = value as Partial<PublicStatus>;
  return (
    typeof status.state === "string" &&
    typeof status.checkedAt === "string" &&
    Array.isArray(status.services) &&
    Boolean(status.recent) &&
    typeof status.recent?.active === "number" &&
    typeof status.recent?.deployed === "number" &&
    typeof status.recent?.failed === "number" &&
    typeof status.recent?.total === "number" &&
    typeof status.recent?.failureRate === "number"
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
    <div className="bg-[#181916] px-4 py-5">
      <div className={`mb-4 h-1 w-4 ${accent.includes("emerald") ? "bg-emerald-400" : accent.includes("red") ? "bg-red-400" : accent.includes("amber") ? "bg-amber-300" : accent.includes("violet") ? "bg-violet" : "bg-white/25"}`} />
      <p className="text-[29px] font-semibold leading-none tracking-[-0.055em] text-white">{value}</p>
      <p className="mt-0.5 text-[11px] text-white/40">{label}</p>
    </div>
  );
}
