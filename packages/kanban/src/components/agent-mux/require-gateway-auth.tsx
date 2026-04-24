"use client";

import Link from "next/link";

import { useGatewayAuth } from "@/components/agent-mux/gateway-provider";

export function RequireGatewayAuth(props: { children: React.ReactNode; title?: string; body?: string }) {
  const { isAuthenticated } = useGatewayAuth();

  if (isAuthenticated) {
    return <>{props.children}</>;
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center px-6 py-10">
      <div className="w-full rounded-3xl border border-border bg-card p-8 shadow-lg">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
          Gateway Required
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {props.title ?? "Connect agent-mux before using this page"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-foreground-muted">
          {props.body ??
            "This surface wraps live agent-mux sessions and hooks. Save a gateway URL and bearer token in settings, then come back here."}
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/login"
            className="inline-flex items-center rounded-full border border-primary/30 bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Connect gateway
          </Link>
          <Link
            href="/settings"
            className="inline-flex items-center rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground-muted"
          >
            Open settings
          </Link>
        </div>
      </div>
    </section>
  );
}
