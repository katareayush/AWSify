import { Boxes, Cloud, Database, Github, Network } from "lucide-react";

type Icon = typeof Cloud;

const rows: Array<{ icon: Icon; label: string; sub: string; highlight?: boolean }> = [
  { icon: Github, label: "GitHub Actions", sub: "OIDC role" },
  { icon: Boxes, label: "ECR registry", sub: "immutable tags" },
  { icon: Network, label: "Application LB", sub: ":443 → :3000" },
  { icon: Cloud, label: "ECS Fargate", sub: "2× tasks · 512/1024", highlight: true },
  { icon: Database, label: "RDS Postgres", sub: "db.t4g.micro" }
];

export function ArchitectureDiagram() {
  return (
    <div className="scan-line relative h-full overflow-hidden rounded-xl border border-white/[0.08] bg-[#070708] p-4 sm:rounded-2xl sm:p-6">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10.5px] uppercase tracking-wider text-white/40">
          architecture
        </p>
        <span className="font-mono text-[10px] text-white/30">us-east-1</span>
      </div>

      <div className="mt-6 space-y-3">
        {rows.map((row, idx) => (
          <div key={row.label}>
            <DiagRow icon={row.icon} label={row.label} sub={row.sub} highlight={row.highlight} />
            {idx < rows.length - 1 ? <Pipe /> : null}
          </div>
        ))}
      </div>

      <div className="absolute right-4 top-4 h-1.5 w-1.5 animate-pulse-slow rounded-full bg-violet shadow-[0_0_12px_rgba(139,92,246,0.7)]" />
    </div>
  );
}

interface DiagRowProps {
  icon: Icon;
  label: string;
  sub: string;
  highlight?: boolean;
}

function DiagRow({ icon: Icon, label, sub, highlight = false }: DiagRowProps) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 sm:px-3.5 ${
        highlight
          ? "border-violet/40 bg-violet/[0.08]"
          : "border-white/[0.08] bg-white/[0.02]"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <Icon className={`h-3.5 w-3.5 ${highlight ? "text-violet-soft" : "text-white/55"}`} />
        <span className={`truncate text-[13px] ${highlight ? "text-white" : "text-white/80"}`}>
          {label}
        </span>
      </div>
      <span className="shrink-0 font-mono text-[10.5px] text-white/35">{sub}</span>
    </div>
  );
}

function Pipe() {
  return <div className="mx-auto mt-3 h-3 w-px bg-white/[0.1]" />;
}
