import type * as React from "react";
import { cn } from "../../lib/utils";

export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn(
        "relative overflow-hidden border border-white/[0.12] bg-[#181916]",
        className
      )}
      {...props}
    />
  );
}
