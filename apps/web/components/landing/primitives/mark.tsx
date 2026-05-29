export function Mark() {
  return (
    <div className="relative flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-white/15 to-white/5 ring-1 ring-inset ring-white/15">
      <div className="absolute inset-0 rounded-[10px] bg-violet/20 blur-md" />
      <div className="relative h-3 w-3 rounded-[3px] bg-violet shadow-[0_0_12px_rgba(139,92,246,0.8)]" />
    </div>
  );
}
