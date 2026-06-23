import { GitBranch, Layers, TerminalSquare, Workflow, Zap } from "lucide-react";
import { Section } from "./primitives/section";
import { howItWorksSteps } from "./data";

const stepIcons = [GitBranch, Workflow, Layers, Zap];

export function HowItWorks() {
  return (
    <Section id="how" eyebrow="How it works" title="Four steps from repository to live service.">
      <div className="mt-10 space-y-px overflow-hidden rounded-xl border border-white/[0.08] sm:mt-16 sm:rounded-2xl">
        {howItWorksSteps.map((step, idx) => (
          <StepRow
            key={step.n}
            n={step.n}
            title={step.title}
            body={step.body}
            code={step.code}
            Icon={stepIcons[idx]}
          />
        ))}
      </div>
    </Section>
  );
}

interface StepRowProps {
  n: string;
  title: string;
  body: string;
  code: string;
  Icon: typeof GitBranch;
}

function StepRow({ n, title, body, code, Icon }: StepRowProps) {
  return (
    <div className="grid grid-cols-1 gap-0 bg-[#070708] lg:grid-cols-[180px_1fr_minmax(0,420px)]">
      <div className="border-b border-white/[0.06] p-5 sm:p-7 lg:border-b-0 lg:border-r">
        <span className="font-mono text-[12px] text-violet-soft">{n}</span>
        <div className="mt-3 flex items-center gap-2 text-white/30">
          <Icon className="h-3.5 w-3.5" />
          <span className="text-[11px] uppercase tracking-wider">step</span>
        </div>
      </div>
      <div className="border-b border-white/[0.06] p-5 sm:p-7 lg:border-b-0 lg:border-r">
        <h3 className="text-[19px] font-medium tracking-tight text-white sm:text-[22px]">{title}</h3>
        <p className="mt-3 max-w-md text-[14.5px] leading-[1.6] text-white/55">{body}</p>
      </div>
      <div className="relative bg-black/40 p-4 sm:p-5">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-white/35">
          <TerminalSquare className="h-3 w-3" />
          terminal
        </div>
        <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-[11.5px] leading-[1.7] text-white/75 sm:text-[12px]">
          {code}
          <span className="ml-1 inline-block h-[12px] w-[7px] translate-y-[2px] bg-violet/80 animate-caret align-middle" />
        </pre>
      </div>
    </div>
  );
}
