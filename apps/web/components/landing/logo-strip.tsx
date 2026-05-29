import { logoStripItems } from "./data";

export function LogoStrip() {
  return (
    <section className="relative z-10 border-y border-white/[0.06]">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-center font-mono text-[10.5px] uppercase tracking-[0.2em] text-white/30">
          Built on rigorous primitives
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-[14px] font-medium text-white/40">
          {logoStripItems.map((label) => (
            <span key={label} className="transition-colors hover:text-white/70">
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
