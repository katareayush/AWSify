export function AppBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <div className="absolute inset-0 bg-grid-fine opacity-[0.35]" />
      <div className="absolute inset-0 bg-noise opacity-[0.03] mix-blend-overlay" />
      <div className="absolute -top-32 left-1/3 h-[420px] w-[720px] -translate-x-1/2 violet-glow opacity-30" />
    </div>
  );
}
