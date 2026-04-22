import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border px-3 py-1 text-base shadow-sm transition-all",
          "border-[var(--tkc-rule-m)] bg-[image:var(--tkc-surface)] text-[var(--tkc-ink)]",
          "placeholder:text-[var(--tkc-placeholder)]",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[var(--tkc-ink)]",
          "focus-visible:outline-none focus-visible:border-[var(--tkc-cinnabar)]",
          "focus-visible:ring-1 focus-visible:ring-[var(--tkc-focus-ring)]",
          "focus-visible:shadow-[0_0_0_3px_var(--tkc-focus-ring)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "md:text-sm",
          className
        )}
        style={{ fontFamily: "var(--font-body)" }}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
