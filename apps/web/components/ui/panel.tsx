import type * as React from "react";
import { cn } from "../../lib/utils";

export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-white/[0.01] shadow-[0_10px_30px_-20px_rgba(0,0,0,0.7)] backdrop-blur-sm",
        className
      )}
      {...props}
    />
  );
}
