import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-xs border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider font-mono",
  {
    variants: {
      variant: {
        default:
          "border-border-faint bg-surface-2 text-muted-foreground",
        primary:
          "border-primary/40 bg-primary/10 text-primary",
        success:
          "border-trust-high/40 bg-trust-high/10 text-trust-high",
        warning:
          "border-trust-mid/40 bg-trust-mid/10 text-trust-mid",
        danger: "border-trust-low/40 bg-trust-low/10 text-trust-low",
        outline:
          "border-border-strong text-foreground bg-transparent",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
