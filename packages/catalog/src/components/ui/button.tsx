import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border text-sm transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-[var(--tkc-rule)] bg-[image:var(--tkc-surface)] text-[var(--tkc-ink)] shadow-[0_2px_0_var(--tkc-rule)] hover:-translate-y-px hover:bg-[image:var(--tkc-surface-hover)] hover:shadow-[0_3px_0_var(--tkc-rule)]",
        destructive:
          "border-[#5a120b] bg-[linear-gradient(180deg,#d04a3b_0%,#8a2519_100%)] text-[var(--tkc-danger-fg)] shadow-[0_2px_0_#5a120b] hover:-translate-y-px hover:shadow-[0_3px_0_#5a120b]",
        outline:
          "border-[var(--tkc-rule-m)] bg-[rgba(255,255,255,0.55)] text-[var(--tkc-ink-soft)] hover:bg-[var(--tkc-panel)] hover:text-[var(--tkc-ink)]",
        secondary:
          "border-[var(--tkc-rule-m)] bg-[rgba(255,251,244,0.78)] text-[var(--tkc-ink)] hover:bg-[var(--tkc-panel)]",
        ghost:
          "border-transparent bg-transparent text-[var(--tkc-ink-soft)] shadow-none hover:bg-[var(--tkc-panel-muted)] hover:text-[var(--tkc-ink)]",
        link:
          "border-transparent bg-transparent p-0 text-[var(--tkc-cinnabar)] shadow-none hover:text-[var(--tkc-link-hover)] hover:underline",
        magenta:
          "border-[var(--tkc-rule)] bg-[linear-gradient(180deg,#f0ddba_0%,#d7b072_100%)] text-[var(--tkc-ink)] shadow-[0_2px_0_var(--tkc-rule)] hover:-translate-y-px hover:shadow-[0_3px_0_var(--tkc-rule)]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, style, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        style={{
          fontFamily: variant === "link" ? "var(--font-body)" : "var(--font-display)",
          fontStyle: variant === "link" ? "normal" : "italic",
          ...style,
        }}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
