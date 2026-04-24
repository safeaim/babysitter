"use client";

import Link from "next/link";

import { AlertTriangle, ArrowUpRight, CheckCircle2, Hand, TerminalSquare } from "lucide-react";

import { buildRunArtifactShortcuts, buildSessionTimeline } from "@/lib/babysitter-overlays";

interface EventBuffer {
  events: Array<Record<string, unknown>>;
}

export function SessionObservabilityPanel(props: {
  sessionId: string;
  runs: Array<Record<string, unknown>>;
  eventBuffers: Record<string, EventBuffer | undefined>;
}) {
  const timeline = buildSessionTimeline(props.runs, props.eventBuffers).slice(-14);
  const shortcuts = buildRunArtifactShortcuts(props.runs);

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Execution overlay</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Session activity merged with run milestones</h2>
          <p className="mt-2 text-sm leading-6 text-foreground-muted">
            Transcript turns, tool calls, approvals, and run outcomes are shown in one thread so breakpoint review and artifact lookup keep the run and session context together.
          </p>
        </div>
        <span className="rounded-full border border-border px-3 py-1 text-xs text-foreground-muted">
          Session {props.sessionId}
        </span>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <div className="space-y-3">
          {timeline.map((item) => (
            <article key={item.id} className="rounded-2xl border border-border bg-background/65 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-border px-2 py-0.5 text-[11px] uppercase tracking-[0.18em] text-foreground-muted">
                  {item.kind}
                </span>
                <span className="text-sm font-semibold text-foreground">{item.label}</span>
                <Link href={item.href ?? `/runs/${item.runId}`} className="text-xs text-primary">
                  {item.runId}
                </Link>
              </div>
              <pre className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-foreground-secondary">
                {item.text}
              </pre>
            </article>
          ))}
          {timeline.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-foreground-muted">
              No merged timeline events are available for this session yet.
            </div>
          ) : null}
        </div>

        <aside className="space-y-4">
          <article className="rounded-2xl border border-border bg-background/70 p-4">
            <div className="flex items-center gap-2">
              <TerminalSquare className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Artifact shortcuts</h3>
            </div>
            <div className="mt-4 space-y-3">
              {shortcuts.map((item) => (
                <div key={item.runId} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link href={`/runs/${item.runId}`} className="font-mono text-sm text-primary">
                      {item.runId}
                    </Link>
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-foreground-muted">
                      {item.status}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-foreground">{item.processId}</div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-foreground-muted">
                    <span>{item.logTaskCount} log tasks</span>
                    <span>{item.resultTaskCount} result payloads</span>
                    {item.failedTaskCount > 0 ? <span>{item.failedTaskCount} failed tasks</span> : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {item.breakpointEffectId ? (
                      <Link
                        href={`/runs/${item.runId}?effectId=${encodeURIComponent(item.breakpointEffectId)}`}
                        className="inline-flex items-center gap-1 text-primary"
                      >
                        <Hand className="h-3 w-3" />
                        Review breakpoint
                      </Link>
                    ) : null}
                    {item.errorEffectId ? (
                      <Link
                        href={`/runs/${item.runId}?effectId=${encodeURIComponent(item.errorEffectId)}`}
                        className="inline-flex items-center gap-1 text-primary"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        Open failed task
                      </Link>
                    ) : null}
                    <Link href={`/runs/${item.runId}`} className="inline-flex items-center gap-1 text-primary">
                      <ArrowUpRight className="h-3 w-3" />
                      Open run detail
                    </Link>
                  </div>
                </div>
              ))}
              {shortcuts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-foreground-muted">
                  Run artifacts will appear here once the session emits execution data.
                </div>
              ) : null}
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-background/70 p-4 text-sm text-foreground-muted">
            <div className="inline-flex items-center gap-2 text-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Session, run, and task links now resolve to the same execution path instead of splitting transcript review from observability review.
            </div>
          </article>
        </aside>
      </div>
    </section>
  );
}
