import type { ReactNode } from "react";

interface SectionProps {
  icon: ReactNode;
  title: string;
  status: string;
  statusTone: "ok" | "muted";
  children: ReactNode;
}

export function Section({ icon, title, status, statusTone, children }: SectionProps) {
  return (
    <div className="rounded-xl border border-white/[0.06]">
      <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-3">
        <div className="flex items-center gap-2.5">
          {icon}
          <p className="text-[13px] font-medium text-white">{title}</p>
        </div>
        <span
          className={`text-[11.5px] ${
            statusTone === "ok" ? "text-emerald-300" : "text-white/40"
          }`}
        >
          {status}
        </span>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] text-white/45">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export function Input({
  value,
  onChange,
  placeholder
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-9 w-full rounded-md border border-white/[0.08] bg-white/[0.02] px-3 text-[12.5px] text-white outline-none placeholder:text-white/25 focus:border-white/20"
    />
  );
}
