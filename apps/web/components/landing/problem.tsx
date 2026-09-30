import { Section } from "./primitives/section";
import { pains } from "./data";

export function Problem() {
  return (
    <Section id="problem" eyebrow="The problem / 01" title="Shipping should feel like momentum." light>
      <div className="mt-12 grid border-l border-t border-black/20 sm:mt-16 sm:grid-cols-2">
        {pains.map((p, index) => (
          <PainCard key={p.title} index={index + 1} title={p.title} body={p.body} />
        ))}
      </div>
    </Section>
  );
}

function PainCard({ index, title, body }: { index: number; title: string; body: string }) {
  return (
    <div className="group relative min-h-[240px] border-b border-r border-black/20 p-6 transition-colors hover:bg-[#e8e3d9] sm:p-8">
      <div className="flex items-center justify-between font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#b92c19]">
        <span>Friction / {String(index).padStart(2, "0")}</span><span>↗</span>
      </div>
      <h3 className="mt-8 text-[24px] font-semibold tracking-[-0.04em] text-[#0a0a0a] sm:text-[29px]">{title}</h3>
      <p className="mt-3 max-w-md text-[14.5px] leading-[1.6] text-black/60">{body}</p>
    </div>
  );
}
