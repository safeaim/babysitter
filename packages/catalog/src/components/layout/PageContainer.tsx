"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";

export interface PageContainerProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  activePath?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
  contentClassName?: string;
}

const maxWidthClasses = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
  "2xl": "max-w-7xl",
  full: "max-w-full",
};

const paddingClasses = {
  none: "",
  sm: "px-4 py-4",
  md: "px-4 py-6 md:px-6 md:py-8",
  lg: "px-4 py-8 md:px-8 md:py-12",
};

export function PageContainer({
  children,
  showSidebar = false,
  activePath,
  maxWidth = "2xl",
  padding = "md",
  className,
  contentClassName,
}: PageContainerProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(true);

  return (
    <div className={cn("flex min-h-[calc(100vh-3.5rem)]", className)}>
      {showSidebar && (
        <>
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="fixed bottom-4 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--tkc-rule)] bg-[linear-gradient(180deg,#d04a3b_0%,#8a2519_100%)] text-[var(--tkc-danger-fg)] shadow-[0_8px_24px_rgba(39,25,12,0.16)] transition-transform hover:-translate-y-px lg:hidden"
            aria-label="Open navigation"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <Sidebar
            activePath={activePath}
            isCollapsed={sidebarCollapsed}
            onCollapsedChange={setSidebarCollapsed}
          />
        </>
      )}

      <main
        className={cn(
          "flex-1",
          showSidebar && "lg:ml-0",
          paddingClasses[padding],
          contentClassName
        )}
      >
        <div className={cn("mx-auto", maxWidthClasses[maxWidth])}>{children}</div>
      </main>
    </div>
  );
}

export default PageContainer;
