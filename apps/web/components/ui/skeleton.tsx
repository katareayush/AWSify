export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-white/[0.05] ${className}`} />;
}

export function PageSkeleton({ variant = "default" }: { variant?: "default" | "list" | "detail" }) {
  if (variant === "detail") {
    return (
      <div className="space-y-6">
        {/* Header panel: breadcrumb, title + actions, chips, stage strip */}
        <div className="rounded-xl border border-white/[0.08]">
          <div className="space-y-4 p-5 sm:p-6">
            <Skeleton className="h-3.5 w-44" />
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-56" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-9 w-9 rounded-lg" />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-32 rounded-md" />
              ))}
            </div>
          </div>
          <div className="border-t border-white/[0.06] px-5 py-4 sm:px-6">
            <Skeleton className="h-7 w-full" />
          </div>
        </div>
        {/* Tab bar */}
        <div className="flex gap-1 border-b border-white/[0.07] pb-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-24" />
          ))}
        </div>
        {/* Tab content */}
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Skeleton className="h-[380px] w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className="space-y-5">
        {/* Heading + action */}
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
          <Skeleton className="h-9 w-40 rounded-lg" />
        </div>
        {/* Row list */}
        <div className="divide-y divide-white/[0.04] rounded-xl border border-white/[0.06]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="h-2 w-2 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-3 w-72 max-w-full" />
              </div>
              <Skeleton className="h-3.5 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Dashboard: hero, stat cards, connection card, recent list
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-40 rounded-lg" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px] w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[76px] w-full rounded-xl" />
      <div className="rounded-xl border border-white/[0.06]">
        <div className="border-b border-white/[0.05] px-5 py-3">
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="divide-y divide-white/[0.04]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="h-2 w-2 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-44" />
                <Skeleton className="h-3 w-64 max-w-full" />
              </div>
              <Skeleton className="h-3.5 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
