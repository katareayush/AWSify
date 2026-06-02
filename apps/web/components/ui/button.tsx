import { cva, type VariantProps } from "class-variance-authority";
import { cloneElement, isValidElement, type ReactElement } from "react";
import type * as React from "react";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex h-9 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-[13px] font-medium tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/40 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-white text-black hover:bg-white/90",
        secondary:
          "border border-white/[0.1] bg-white/[0.04] text-white/85 hover:border-white/[0.18] hover:bg-white/[0.07] hover:text-white",
        quiet: "text-white/65 hover:bg-white/[0.05] hover:text-white",
        violet:
          "bg-violet/15 text-violet-soft ring-1 ring-inset ring-violet/30 hover:bg-violet/25 hover:text-white"
      },
      size: {
        default: "h-9 px-3.5",
        sm: "h-8 px-3 text-[12.5px]",
        lg: "h-10 px-5 text-[14px]",
        icon: "h-9 w-9 px-0"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild, children, ...props }: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size, className }));

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string }>;
    return cloneElement(child, {
      ...props,
      className: cn(classes, child.props.className)
    } as React.HTMLAttributes<HTMLElement>);
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
