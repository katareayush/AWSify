import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={`px-6 py-12 text-left sm:px-8 ${className ?? ""}`}>
      <Icon className="h-5 w-5 text-violet-soft" />
      <p className="mt-6 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">Nothing here yet</p>
      <p className="mt-2 text-[22px] font-semibold tracking-[-0.04em] text-white">{title}</p>
      {description && (
        <p className="mt-2 max-w-md text-[13px] leading-[1.6] text-white/55">{description}</p>
      )}
      {action && <div className="mt-6 inline-flex">{action}</div>}
    </div>
  );
}
