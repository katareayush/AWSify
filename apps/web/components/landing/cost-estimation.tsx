import { Section } from "./primitives/section";
import { costHighlights, costLines } from "./data";

export function CostEstimation() {
  const total = costLines.reduce((a, b) => a + b.cost, 0);

  return (
    <Section
      eyebrow="Before you spend a dollar"
      title="Cost estimation, line by line."
      sub="AWS-ify simulates a month of usage from the plan and shows you exactly where the money goes."
    >
      <div className="mt-16 grid gap-6 lg:grid-cols-5">
        <CostTable total={total} />
        <div className="space-y-4 lg:col-span-2">
          {costHighlights.map((h) => (
            <CostHighlight key={h.label} kpi={h.kpi} label={h.label} body={h.body} />
          ))}
        </div>
      </div>
    </Section>
  );
}

function CostTable({ total }: { total: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#070708] lg:col-span-3">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-violet" />
          <p className="font-mono text-[10.5px] uppercase tracking-wider text-white/40">
            monthly estimate / us-east-1
          </p>
        </div>
        <span className="font-mono text-[10.5px] text-white/30">plan #042</span>
      </div>
      <div className="divide-y divide-white/[0.05]">
        {costLines.map((l) => (
          <div key={l.svc} className="grid grid-cols-12 items-center px-6 py-3.5">
            <div className="col-span-5 text-[13.5px] text-white">{l.svc}</div>
            <div className="col-span-5 font-mono text-[11.5px] text-white/45">{l.detail}</div>
            <div className="col-span-2 text-right font-mono text-[13px] text-white/85">
              ${l.cost.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-white/[0.08] bg-white/[0.02] px-6 py-4">
        <span className="text-[13px] text-white/55">Estimated total</span>
        <span className="font-mono text-[18px] font-medium tracking-tight text-white">
          ${total.toFixed(2)}
          <span className="ml-1 text-[11px] text-white/45">/ mo</span>
        </span>
      </div>
    </div>
  );
}

function CostHighlight({ kpi, label, body }: { kpi: string; label: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-transparent p-5">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[26px] font-medium tracking-tight text-white">{kpi}</span>
        <span className="text-[11px] uppercase tracking-wider text-white/40">{label}</span>
      </div>
      <p className="mt-2 text-[13px] leading-[1.55] text-white/55">{body}</p>
    </div>
  );
}
