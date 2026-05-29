import { Section } from "./primitives/section";
import { pains } from "./data";

export function Problem() {
  return (
    <Section id="problem" eyebrow="The problem" title="Shipping to AWS is still painful.">
      <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] sm:grid-cols-2">
        {pains.map((p) => (
          <PainCard key={p.title} title={p.title} body={p.body} />
        ))}
      </div>
    </Section>
  );
}

function PainCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="group relative overflow-hidden bg-[#070708] p-7 transition-colors hover:bg-[#0b0b0e]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="h-full w-1/3 divider-x animate-beam" />
      </div>
      <div className="flex items-center gap-2 text-[12px] font-medium text-white/40">
        <span className="h-1 w-1 rounded-full bg-violet" />
        friction
      </div>
      <h3 className="mt-4 text-[22px] font-medium tracking-tight text-white">{title}</h3>
      <p className="mt-3 max-w-md text-[14.5px] leading-[1.6] text-white/55">{body}</p>
    </div>
  );
}
