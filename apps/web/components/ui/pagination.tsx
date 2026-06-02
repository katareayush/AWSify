"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  label?: string;
}

export function Pagination({ page, pageSize, total, onPageChange, label = "items" }: PaginationProps) {
  if (total <= pageSize) return null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  return (
    <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.05] pt-4 text-[12px] text-white/55">
      <span className="font-mono text-[11px] tracking-wider text-white/40">
        {from}–{to} of {total} {label}
      </span>
      <div className="flex items-center gap-1">
        <NavButton onClick={() => onPageChange(page - 1)} disabled={!canPrev} aria-label="Previous page">
          <ChevronLeft className="h-3.5 w-3.5" />
        </NavButton>
        <span className="px-2 font-mono text-[11px] text-white/60">
          {page + 1} / {totalPages}
        </span>
        <NavButton onClick={() => onPageChange(page + 1)} disabled={!canNext} aria-label="Next page">
          <ChevronRight className="h-3.5 w-3.5" />
        </NavButton>
      </div>
    </div>
  );
}

function NavButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.02] text-white/65 transition-colors enabled:hover:border-white/[0.16] enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

