import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, KeyRound } from "lucide-react";
import type { AwsConnection } from "../../lib/api";
import { Button } from "../ui/button";

interface ConnectionCardProps {
  connections: AwsConnection[];
  failureRate: number;
}

export function ConnectionCard({ connections, failureRate }: ConnectionCardProps) {
  const valid = connections.filter((c) => c.status === "valid");
  const invalid = connections.filter((c) => c.status === "invalid");
  const pending = connections.filter((c) => c.status === "pending");
  const primary = valid[0] ?? connections[0] ?? null;
  const state = valid.length > 0 ? "ready" : connections.length > 0 ? "attention" : "missing";

  return (
    <div className="relative overflow-hidden rounded-xl border border-white/[0.07] bg-gradient-to-b from-white/[0.02] to-transparent px-5 py-4">
      <div
        className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r to-transparent ${
          state === "ready" ? "from-emerald-500/40" : "from-amber-500/40"
        }`}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
              state === "ready"
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                : "border-amber-500/25 bg-amber-500/10 text-amber-300"
            }`}
          >
            {state === "ready" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          </span>
          <div>
            <p className="text-[13px] font-medium text-white">
              {state === "ready"
                ? "AWS connection ready"
                : state === "attention"
                  ? "AWS connection needs attention"
                  : "AWS connection missing"}
            </p>
            <p className="mt-0.5 text-[11.5px] text-white/40">
              {primary ? (
                <>
                  <span className="font-mono text-white/55">{primary.accountId}</span>
                  {" · "}
                  <span className="font-mono text-white/55">{primary.defaultRegion}</span>
                  {" · "}
                  {primary.status}
                </>
              ) : (
                "Connect a valid IAM role before starting deployments."
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="grid grid-cols-3 gap-4 text-right">
            <MiniMetric label="Invalid" value={invalid.length} alert={invalid.length > 0} />
            <MiniMetric label="Pending" value={pending.length} />
            <MiniMetric label="Failure" value={`${failureRate}%`} alert={failureRate > 25} />
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link href="/connections">
              {state === "ready" ? <KeyRound className="h-3.5 w-3.5" /> : null}
              {state === "ready" ? "Manage" : "Fix AWS"}
              {state !== "ready" && <ArrowRight className="h-3.5 w-3.5" />}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, alert }: { label: string; value: number | string; alert?: boolean }) {
  return (
    <div>
      <p className={`font-mono text-[14px] ${alert ? "text-amber-300" : "text-white"}`}>{value}</p>
      <p className="text-[10.5px] text-white/35">{label}</p>
    </div>
  );
}
