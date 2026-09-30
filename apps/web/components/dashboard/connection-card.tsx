import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { AwsConnection } from "../../lib/api";

interface ConnectionCardProps { connections: AwsConnection[]; failureRate: number; }

export function ConnectionCard({ connections, failureRate }: ConnectionCardProps) {
  const valid = connections.filter((c) => c.status === "valid");
  const primary = valid[0] ?? connections[0] ?? null;
  const state = valid.length > 0 ? "Connected" : connections.length > 0 ? "Needs attention" : "Not connected";
  const healthy = valid.length > 0;

  return (
    <section className="flex h-full flex-col border border-white/[0.14] bg-[#181916]">
      <div className="flex items-center justify-between border-b border-white/[0.13] px-5 py-4">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.13em] text-white/60">Cloud account</p>
        <span className={`flex items-center gap-2 text-[11px] ${healthy ? "text-emerald-300" : "text-amber-300"}`}>
          <span className={`h-1.5 w-1.5 ${healthy ? "bg-emerald-300" : "bg-amber-300"}`} />{state}
        </span>
      </div>
      <div className="flex-1 px-5 py-5">
        <p className="text-[22px] font-semibold tracking-[-0.045em] text-white">{primary ? primary.accountId : "Connect AWS"}</p>
        <p className="mt-1 font-mono text-[11px] text-white/45">{primary ? `${primary.defaultRegion} / IAM role` : "No account linked to this workspace"}</p>
        <dl className="mt-8 divide-y divide-white/[0.1] border-y border-white/[0.1]">
          <Metric label="Valid connections" value={String(valid.length).padStart(2, "0")} />
          <Metric label="Accounts linked" value={String(connections.length).padStart(2, "0")} />
          <Metric label="Deployment failures" value={`${failureRate}%`} />
        </dl>
      </div>
      <Link href="/connections" className="flex items-center justify-between border-t border-white/[0.13] px-5 py-4 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white">
        Manage connections <ArrowUpRight className="h-4 w-4 text-violet-soft" />
      </Link>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between py-3 text-[12px]"><dt className="text-white/45">{label}</dt><dd className="font-mono text-white/80">{value}</dd></div>;
}
