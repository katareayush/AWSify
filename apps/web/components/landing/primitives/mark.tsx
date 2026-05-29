export function Mark() {
  return (
    <div className="relative flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-white/15 to-white/5 ring-1 ring-inset ring-white/15">
      <div className="absolute inset-0 rounded-md bg-violet/20 blur-md" />
      <div className="relative h-2.5 w-2.5 rounded-[3px] bg-violet shadow-[0_0_12px_rgba(139,92,246,0.8)]" />
    </div>
  );
}
