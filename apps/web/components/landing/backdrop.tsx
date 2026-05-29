export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <div className="absolute inset-0 bg-grid bg-radial-fade opacity-[0.45] animate-grid-drift" />
      <div className="absolute inset-0 bg-noise opacity-[0.04] mix-blend-overlay" />
      <div className="absolute -top-40 left-1/2 h-[520px] w-[920px] -translate-x-1/2 violet-glow opacity-70 animate-aurora" />
      <div className="absolute bottom-0 left-1/4 h-[300px] w-[420px] violet-glow opacity-30 animate-float" />
    </div>
  );
}
