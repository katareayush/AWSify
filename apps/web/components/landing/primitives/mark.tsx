export function Mark() {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-violet/[0.12] ring-1 ring-inset ring-violet/25">
      <svg width="20" height="16" viewBox="0 0 20 16" fill="none" aria-hidden="true">
        {/* Stacked infrastructure layers — narrow at top, widest at base */}
        <rect x="5"  y="0"  width="10" height="4.5" rx="2"   fill="#8B5CF6" />
        <rect x="2"  y="6"  width="16" height="4.5" rx="2"   fill="#8B5CF6" fillOpacity="0.6" />
        <rect x="0"  y="12" width="20" height="4.5" rx="1.5" fill="#8B5CF6" fillOpacity="0.28" />
      </svg>
    </div>
  );
}
