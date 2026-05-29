import type * as React from "react";
import { cn } from "../../lib/utils";

export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <section className={cn("rounded-md border border-border bg-surface shadow-panel", className)} {...props} />;
}
