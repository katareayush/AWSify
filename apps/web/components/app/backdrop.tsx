export function AppBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <div className="absolute inset-0 bg-[#111210]" />
      <div className="absolute inset-0 bg-noise opacity-[0.018] mix-blend-overlay" />
    </div>
  );
}
