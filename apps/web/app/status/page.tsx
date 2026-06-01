"use client";

import { useEffect, useState } from "react";
import { Activity, CheckCircle2, Loader2 } from "lucide-react";
import { Backdrop } from "../../components/landing/backdrop";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
if (!API_BASE) throw new Error("NEXT_PUBLIC_API_URL is required.");

interface PublicStatus {
  state: string;
  checkedAt: string;
  services: Array<{ name: string; state: string }>;
  recent: { active: number; deployed: number; failed: number };
}

export default function StatusPage() {
  const [status, setStatus] = useState<PublicStatus | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/health/public-status`)
      .then((response) => response.json())
      .then(setStatus)
      .catch(() => setStatus({
        state: "degraded",
        checkedAt: new Date().toISOString(),
        services: [{ name: "API", state: "unreachable" }],
        recent: { active: 0, deployed: 0, failed: 0 }
      }));
  }, []);

  return (
    <main className="min-h-screen bg-[#050508] text-white">
      <Backdrop />
      <section className="mx-auto max-w-4xl px-5 py-16 sm:py-24">
        <a href="/" className="text-[13px] text-white/45 hover:text-white">AWS-ify</a>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[13px] uppercase tracking-[0.22em] text-violet-soft">Public status</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">System status</h1>
          </div>
          <div className="rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-[13px] text-white/65">
            {status ? `Checked ${new Date(status.checkedAt).toLocaleTimeString()}` : "Checking..."}
          </div>
        </div>

        <div className="mt-10 rounded-lg border border-white/[0.08] bg-white/[0.035] p-5">
          {!status ? (
            <div className="flex items-center gap-2 text-white/45">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-[13px]">Loading status</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                {status.state === "operational" ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : (
                  <Activity className="h-5 w-5 text-amber-300" />
                )}
                <p className="text-[15px] font-medium">
                  {status.state === "operational" ? "All systems operational" : "Some systems degraded"}
                </p>
              </div>
              <div className="mt-6 divide-y divide-white/[0.06]">
                {status.services.map((service) => (
                  <div key={service.name} className="flex items-center justify-between py-4 text-[13px]">
                    <span className="text-white/75">{service.name}</span>
                    <span className="font-mono text-white/45">{service.state}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {status && (
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Metric label="Active deploys" value={status.recent.active} />
            <Metric label="Recent live" value={status.recent.deployed} />
            <Metric label="Recent failed" value={status.recent.failed} />
          </div>
        )}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4">
      <p className="font-mono text-2xl text-white">{value}</p>
      <p className="mt-1 text-[12px] text-white/45">{label}</p>
    </div>
  );
}
