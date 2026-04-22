import * as React from "react";

import { cn } from "@/lib/utils";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, style, onMouseEnter, onMouseLeave, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative rounded-lg border text-card-foreground",
      "border-[var(--tkc-rule-m)] bg-[color:var(--tkc-panel)]",
      className
    )}
    style={{
      boxShadow:
        "inset 0 1px 0 rgba(255,255,255,0.48), 0 16px 32px rgba(39,25,12,0.08)",
      transition: "box-shadow 0.24s ease, border-color 0.24s ease, transform 0.24s ease",
      ...style,
    }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLDivElement).style.boxShadow =
        "inset 0 1px 0 rgba(255,255,255,0.54), 0 20px 42px rgba(39,25,12,0.12)";
      (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      onMouseEnter?.(e);
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLDivElement).style.boxShadow =
        "inset 0 1px 0 rgba(255,255,255,0.48), 0 16px 32px rgba(39,25,12,0.08)";
      (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      onMouseLeave?.(e);
    }}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight text-[var(--tkc-ink)]", className)}
    style={{ fontFamily: "var(--font-display)" }}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-[var(--tkc-ink-quiet)]", className)}
    style={{ fontFamily: "var(--font-body)" }}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
