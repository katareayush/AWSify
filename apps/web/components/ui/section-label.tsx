export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <p className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
        {children}
      </p>
      <div className="h-px flex-1 bg-white/[0.12]" />
    </div>
  );
}
