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
    <div className={`py-14 text-center ${className ?? ""}`}>
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
        <Icon className="h-5 w-5 text-violet-soft" />
      </div>
      <p className="mt-5 text-[14px] font-medium text-white">{title}</p>
      {description && (
        <p className="mx-auto mt-2 max-w-md text-[13px] leading-[1.6] text-white/55">{description}</p>
      )}
      {action && <div className="mt-5 inline-flex">{action}</div>}
    </div>
  );
}
