import {
  Boxes,
  Check,
  Cloud,
  Database,
  FileCode2,
  GitBranch,
  Github,
  Network,
  TerminalSquare
} from "lucide-react";

type Icon = typeof Cloud;

export function HeroArtifact() {
  return (
    <div className="relative">
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-violet/30 via-white/5 to-transparent opacity-60 blur-[2px]" />
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0c]/80 shadow-[0_30px_120px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        <WindowChrome />
        <div className="grid min-h-[440px] grid-cols-12">
          <FileTree />
          <PlanPanel />
          <GuardrailsPanel />
        </div>
      </div>
    </div>
  );
}

function WindowChrome() {
  return (
    <div className="flex h-10 items-center justify-between border-b border-white/[0.06] bg-white/[0.015] px-4">
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
      </div>
      <div className="flex items-center gap-2 text-[11px] font-mono text-white/40">
        <GitBranch className="h-3 w-3" />
        api-gateway · main · plan #042
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-white/40">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
        connected
      </div>
    </div>
  );
}

const generatedFiles = [
  { label: "Dockerfile" },
  { label: ".github/deploy.yml" },
  { label: "infra/cluster.ts", active: true },
  { label: "infra/service.ts" },
  { label: "infra/alb.ts" },
  { label: "infra/iam.ts" },
  { label: "env.example" }
];

function FileTree() {
  return (
    <aside className="col-span-3 hidden border-r border-white/[0.06] p-4 lg:block">
      <p className="font-mono text-[10px] uppercase tracking-wider text-white/35">Generated</p>
      <ul className="mt-4 space-y-1.5 font-mono text-[12px] text-white/70">
        {generatedFiles.map((f) => (
          <FileRow key={f.label} label={f.label} active={f.active} />
        ))}
      </ul>

      <p className="mt-7 font-mono text-[10px] uppercase tracking-wider text-white/35">
        Stack detected
      </p>
      <div className="mt-3 space-y-1 text-[12px] text-white/60">
        <StackRow label="Runtime" value="Node 20" />
        <StackRow label="Framework" value="Next.js 15" />
        <StackRow label="Build" value="pnpm" />
      </div>
    </aside>
  );
}

function FileRow({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <li
      className={`flex items-center gap-2 rounded-md px-2 py-1 text-[12px] transition-colors ${
        active ? "bg-white/[0.05] text-white" : "text-white/55"
      }`}
    >
      <FileCode2 className="h-3 w-3 opacity-60" />
      {label}
    </li>
  );
}

function StackRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="text-white/85">{value}</span>
    </div>
  );
}

function PlanPanel() {
  return (
    <section className="col-span-12 p-5 lg:col-span-6 lg:p-7">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-white/35">
            Deployment plan
          </p>
          <h3 className="mt-2 text-[19px] font-medium tracking-tight text-white">
            ECS Fargate · us-east-1
          </h3>
          <p className="mt-1.5 text-[13px] text-white/55">
            Reviewed schema · 7 resources · $48.20 / mo est.
          </p>
        </div>
        <span className="rounded-full border border-violet/30 bg-violet/10 px-2.5 py-1 text-[11px] font-medium text-violet-soft">
          awaiting approval
        </span>
      </div>

      <MiniInfraDiagram />

      <div className="mt-5 grid grid-cols-3 gap-2">
        <Pill icon={Boxes} label="ECR" />
        <Pill icon={Cloud} label="Fargate × 2" />
        <Pill icon={Network} label="ALB" />
      </div>
    </section>
  );
}

function Pill({ icon: Icon, label }: { icon: Icon; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <Icon className="h-3.5 w-3.5 text-violet-soft" />
      <span className="text-[12.5px] text-white/85">{label}</span>
    </div>
  );
}

function MiniInfraDiagram() {
  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-white/[0.06] bg-black/30 p-5">
      <div className="grid grid-cols-5 items-center gap-2 text-[10.5px] font-mono text-white/55">
        <Node icon={Github} label="GitHub" />
        <Arrow />
        <Node icon={Boxes} label="ECR" />
        <Arrow />
        <Node icon={Cloud} label="Fargate" highlight />
      </div>
      <div className="my-3 ml-[14%] h-3 w-px bg-white/[0.08]" />
      <div className="grid grid-cols-5 items-center gap-2 text-[10.5px] font-mono text-white/55">
        <Node icon={Network} label="ALB" />
        <Arrow reverse />
        <Node icon={TerminalSquare} label="Logs" />
        <Arrow />
        <Node icon={Database} label="RDS" muted />
      </div>
    </div>
  );
}

function Node({
  icon: Icon,
  label,
  highlight = false,
  muted = false
}: {
  icon: Icon;
  label: string;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 ${
        highlight
          ? "border-violet/40 bg-violet/10 text-violet-soft"
          : muted
            ? "border-dashed border-white/10 text-white/35"
            : "border-white/[0.08] bg-white/[0.02] text-white/80"
      }`}
    >
      <Icon className="h-3 w-3" />
      <span className="truncate">{label}</span>
    </div>
  );
}

function Arrow({ reverse = false }: { reverse?: boolean }) {
  return (
    <div className="flex items-center justify-center text-white/25">
      {reverse ? "←" : "→"}
    </div>
  );
}

const guardrails = [
  "Strict schema validation",
  "Templates own AWS calls",
  "Approval gate enforced",
  "Least-privilege IAM"
];

function GuardrailsPanel() {
  return (
    <aside className="col-span-12 border-t border-white/[0.06] p-5 lg:col-span-3 lg:border-l lg:border-t-0">
      <p className="font-mono text-[10px] uppercase tracking-wider text-white/35">Guardrails</p>
      <ul className="mt-4 space-y-2.5 text-[12.5px] text-white/75">
        {guardrails.map((text) => (
          <Guard key={text} text={text} />
        ))}
      </ul>

      <div className="mt-6 overflow-hidden rounded-lg border border-white/[0.06] bg-black/40">
        <div className="border-b border-white/[0.06] px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-white/35">
          $ awsify plan
        </div>
        <pre className="px-3 py-2.5 font-mono text-[10.5px] leading-[1.6] text-white/70">
{`✓ scan repo
✓ infer stack
✓ validate schema
✓ render templates
→ awaiting approval`}
        </pre>
      </div>
    </aside>
  );
}

function Guard({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-violet/15 ring-1 ring-violet/30">
        <Check className="h-2.5 w-2.5 text-violet-soft" />
      </span>
      {text}
    </li>
  );
}
