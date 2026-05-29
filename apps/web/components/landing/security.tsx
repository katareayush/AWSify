import { Check, GitBranch, Lock, ShieldCheck, Workflow } from "lucide-react";
import { Section } from "./primitives/section";
import { securityBadges } from "./data";

type Icon = typeof Lock;

const pillars: Array<{ icon: Icon; title: string; body: string }> = [
  {
    icon: Lock,
    title: "We never touch your credentials.",
    body: "AWS access is via an assumed role in your account, scoped to the resources templates own."
  },
  {
    icon: ShieldCheck,
    title: "AI proposes. Templates execute.",
    body: "Schema validation rejects any resource outside the audited Pulumi template set."
  },
  {
    icon: GitBranch,
    title: "Everything lives in your repo.",
    body: "Infrastructure is committed code — pull requests, reviews, blame, rollback. Like every other artifact you own."
  },
  {
    icon: Workflow,
    title: "Drift detection, by default.",
    body: "Hourly checks compare real AWS state against the plan. Surprises get surfaced before they bite."
  }
];

export function Security() {
  return (
    <Section id="security" eyebrow="Security & reliability" title="Built for teams that can't afford mistakes.">
      <div className="mt-16 grid gap-4 sm:grid-cols-2">
        {pillars.map((p) => (
          <Pillar key={p.title} icon={p.icon} title={p.title} body={p.body} />
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-6 py-5 text-[12.5px] text-white/55">
        {securityBadges.map((label) => (
          <Badge key={label}>{label}</Badge>
        ))}
      </div>
    </Section>
  );
}

function Pillar({ icon: Icon, title, body }: { icon: Icon; title: string; body: string }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#070708] p-7 transition-colors hover:border-white/[0.14]">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
          <Icon className="h-4 w-4 text-violet-soft" />
        </div>
        <div>
          <h3 className="text-[17px] font-medium tracking-tight text-white">{title}</h3>
          <p className="mt-2 text-[14px] leading-[1.6] text-white/55">{body}</p>
        </div>
      </div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Check className="h-3 w-3 text-violet-soft" />
      {children}
    </span>
  );
}
