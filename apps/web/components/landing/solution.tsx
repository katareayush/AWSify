import { Lock, ShieldCheck, Sparkles } from "lucide-react";
import { Section } from "./primitives/section";

type Icon = typeof Sparkles;

const cards: Array<{ icon: Icon; title: string; body: string }> = [
  {
    icon: Sparkles,
    title: "Inference, scoped.",
    body: "LLMs propose plans inside a schema. No free-form AWS calls, ever."
  },
  {
    icon: ShieldCheck,
    title: "Templates, owned.",
    body: "Pulumi modules we audited generate the real resources, least-privilege by default."
  },
  {
    icon: Lock,
    title: "Account, yours.",
    body: "AWS-ify never holds your AWS credentials. Plans execute via an assumed role you control."
  }
];

export function Solution() {
  return (
    <Section eyebrow="The solution" title="A control plane between your repo and AWS.">
      <p className="mx-auto mt-6 max-w-2xl text-center text-[17px] leading-[1.55] text-white/55">
        Anthropic recommends. AWS-ify validates against a strict schema. Templates we
        own execute. You stay in the loop the whole way.
      </p>

      <div className="mt-16 grid gap-4 lg:grid-cols-3">
        {cards.map((c) => (
          <SolutionCard key={c.title} icon={c.icon} title={c.title} body={c.body} />
        ))}
      </div>
    </Section>
  );
}

function SolutionCard({ icon: Icon, title, body }: { icon: Icon; title: string; body: string }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-7 transition-all hover:border-white/[0.14]">
      <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-violet/10 blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="relative">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
          <Icon className="h-4 w-4 text-violet-soft" />
        </div>
        <h3 className="mt-6 text-[19px] font-medium tracking-tight text-white">{title}</h3>
        <p className="mt-2.5 text-[14px] leading-[1.6] text-white/55">{body}</p>
      </div>
    </div>
  );
}
