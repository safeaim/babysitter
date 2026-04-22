import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default:
          "border-[var(--tkc-rule-m)] bg-[rgba(255,255,255,0.55)] text-[var(--tkc-ink)]",
        secondary:
          "border-[var(--tkc-rule-m)] bg-[var(--tkc-panel-muted)] text-[var(--tkc-ink-soft)]",
        destructive:
          "border-[rgba(142,27,27,0.3)] bg-[rgba(142,27,27,0.08)] text-[var(--tkc-ruby)]",
        outline: "border-[var(--tkc-rule-m)] text-[var(--tkc-ink-soft)]",
        success:
          "border-[rgba(47,111,94,0.32)] bg-[rgba(47,111,94,0.1)] text-[var(--tkc-success-strong)]",
        warning:
          "border-[rgba(179,126,62,0.34)] bg-[rgba(179,126,62,0.11)] text-[var(--tkc-amber)]",
        accent:
          "border-[rgba(46,124,138,0.28)] bg-[rgba(46,124,138,0.1)] text-[var(--tkc-cyan)]",
        neon:
          "border-[rgba(192,58,43,0.32)] rounded-full px-3 py-0.5 bg-[rgba(192,58,43,0.08)] text-[var(--tkc-cinnabar)]",
        scifi:
          "border-[rgba(179,126,62,0.36)] rounded-full px-3 py-0.5 bg-[rgba(179,126,62,0.09)] text-[var(--tkc-brass-deep)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, style, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      style={{
        fontFamily:
          variant === "neon" || variant === "scifi"
            ? "var(--font-mono)"
            : "var(--font-body)",
        letterSpacing: variant === "neon" || variant === "scifi" ? "0.14em" : undefined,
        textTransform: variant === "neon" || variant === "scifi" ? "uppercase" : undefined,
        ...style,
      }}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
