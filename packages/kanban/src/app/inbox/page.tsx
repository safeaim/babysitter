"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { RequireGatewayAuth } from "@/components/agent-mux/require-gateway-auth";
import { useGateway, useHookRequests } from "@/lib/agent-mux-ui";

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function buildHookContext(hook: { runId?: string; payload?: unknown }) {
  const payload = hook.payload && typeof hook.payload === "object" ? (hook.payload as Record<string, unknown>) : {};
  const runId = readString(hook.runId) ?? readString(payload.runId) ?? readString(payload["run_id"]);
  const sessionId = readString(payload.sessionId) ?? readString(payload["session_id"]);
  const effectId = readString(payload.effectId) ?? readString(payload["effect_id"]);

  return {
    runId,
    sessionId,
    effectId,
    runHref:
      runId && effectId
        ? `/runs/${runId}?effectId=${encodeURIComponent(effectId)}`
        : runId
          ? `/runs/${runId}`
          : null,
  };
}

export default function InboxPage() {
  return (
    <RequireGatewayAuth>
      <InboxContent />
    </RequireGatewayAuth>
  );
}

function InboxContent() {
  const hooks = useHookRequests();
  const { client } = useGateway();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-6">
      <section className="rounded-3xl border border-border bg-card p-6 shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Hook inbox</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Pending approvals</h1>
        <p className="mt-2 text-sm leading-6 text-foreground-muted">
          Agent-mux breakpoint and hook requests surface here. Decisions go back through the gateway,
          while Babysitter run progress stays visible on the board and run pages.
        </p>
      </section>

      <div className="grid gap-4">
        {hooks.map((hook) => {
          const context = buildHookContext(hook);
          return (
            <article key={hook.hookRequestId} className="rounded-3xl border border-border bg-card p-6 shadow-lg">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-warning/20 bg-warning/10 px-2 py-0.5 text-xs text-warning">
                {hook.hookKind}
              </span>
              <span className="font-mono text-xs text-foreground-muted">{hook.runId}</span>
            </div>
            {(context.runHref || context.sessionId) ? (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {context.runHref ? (
                  <Link href={context.runHref} className="rounded-full border border-border px-2.5 py-1 text-primary hover:border-primary/30">
                    Open run context
                  </Link>
                ) : null}
                {context.sessionId ? (
                  <Link href={`/sessions/${context.sessionId}`} className="rounded-full border border-border px-2.5 py-1 text-primary hover:border-primary/30">
                    Open session
                  </Link>
                ) : null}
                {context.effectId ? (
                  <span className="rounded-full border border-border px-2.5 py-1 text-foreground-muted">
                    Effect {context.effectId}
                  </span>
                ) : null}
              </div>
            ) : null}
            <pre className="mt-4 whitespace-pre-wrap break-words rounded-2xl border border-border bg-background/60 p-4 text-sm text-foreground-secondary">
              {JSON.stringify(hook.payload, null, 2)}
            </pre>
            <p className="mt-3 text-sm text-foreground-muted">
              Deadline: {Math.max(0, Math.floor((hook.deadlineTs - Date.now()) / 1000))}s
            </p>
            <div className="mt-4 flex gap-3">
              <Button
                onClick={() =>
                  void client.request({
                    type: "hook.decision",
                    hookRequestId: hook.hookRequestId,
                    decision: "allow",
                  })
                }
              >
                Allow
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  void client.request({
                    type: "hook.decision",
                    hookRequestId: hook.hookRequestId,
                    decision: "deny",
                  })
                }
              >
                Deny
              </Button>
            </div>
            </article>
          );
        })}
        {hooks.length === 0 ? (
          <section className="rounded-3xl border border-border bg-card p-6 text-sm text-foreground-muted shadow-lg">
            No pending hook approvals.
          </section>
        ) : null}
      </div>
    </div>
  );
}
