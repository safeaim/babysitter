"use client";

import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { WorkspaceRuntimeSurface } from "@a5c-ai/agent-mux-core";

import { RequireGatewayAuth } from "@/components/agent-mux/require-gateway-auth";
import { SessionWorkspaceShell, type SessionTranscriptNode } from "@/components/sessions/session-workspace-shell";
import { useGatewayFetch } from "@/components/agent-mux/gateway-provider";
import { useGateway } from "@/lib/agent-mux-ui";

function formatUsd(totalUsd: number | null): string {
  if (totalUsd == null || !Number.isFinite(totalUsd)) {
    return "unavailable";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: totalUsd >= 1 ? 2 : 4,
    maximumFractionDigits: 4,
  }).format(totalUsd);
}

function readRuntime(value: unknown): WorkspaceRuntimeSurface | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  return value as WorkspaceRuntimeSurface;
}

function buildTranscript(
  runs: Array<Record<string, unknown>>,
  eventBuffers: Record<string, { events: Record<string, unknown>[] } | undefined>,
): SessionTranscriptNode[] {
  const orderedRuns = [...runs].sort((left, right) => Number(left.startedAt ?? 0) - Number(right.startedAt ?? 0));
  const nodes: SessionTranscriptNode[] = [];

  for (const run of orderedRuns) {
    const runId = String(run.runId ?? "");
    const buffer = eventBuffers[runId];
    if (!buffer) {
      continue;
    }

    let currentAssistantText = "";
    let currentThinkingText = "";
    const flushAssistant = () => {
      if (!currentAssistantText) return;
      nodes.push({ kind: "assistant", text: currentAssistantText, runId });
      currentAssistantText = "";
    };
    const flushThinking = () => {
      if (!currentThinkingText) return;
      nodes.push({ kind: "thinking", text: currentThinkingText, runId });
      currentThinkingText = "";
    };

    for (const event of buffer.events) {
      const type = String(event.type ?? "");
      if (type === "user_message") {
        flushThinking();
        flushAssistant();
        const text = String(event.text ?? "");
        if (text.length > 0) {
          nodes.push({ kind: "user", text, runId });
        }
        continue;
      }

      if (type === "thinking_delta") {
        const delta = String(event.delta ?? "");
        if (delta.length > 0) {
          currentThinkingText += delta;
        }
        continue;
      }

      if (type === "thinking_stop") {
        const finalThinking = String(event.thinking ?? "");
        if (finalThinking.length > 0) {
          currentThinkingText = finalThinking;
        }
        flushThinking();
        continue;
      }

      if (type === "text_delta") {
        flushThinking();
        currentAssistantText += String(event.delta ?? "");
        continue;
      }

      if (type === "message_stop") {
        flushThinking();
        const finalText = String(event.text ?? "");
        if (finalText.length > 0) {
          currentAssistantText = finalText;
        }
        flushAssistant();
        continue;
      }

      flushThinking();
      flushAssistant();

      if (type === "tool_call_start" || type === "tool_call_ready") {
        nodes.push({
          kind: "tool",
          runId,
          label: `start ${String(event.toolName ?? "tool")}`,
          text:
            type === "tool_call_ready"
              ? JSON.stringify(event.input ?? {}, null, 2)
              : String(event.inputAccumulated ?? ""),
        });
      }

      if (type === "tool_result" || type === "tool_error") {
        nodes.push({
          kind: "tool",
          runId,
          label: String(event.toolName ?? "tool"),
          text: JSON.stringify(event, null, 2),
        });
      }
    }

    flushThinking();
    flushAssistant();
  }

  return nodes;
}

function accumulateEventCost(
  runIds: string[],
  eventBuffers: Record<string, { events: Record<string, unknown>[] } | undefined>,
): number | null {
  let found = false;
  let total = 0;
  for (const runId of runIds) {
    const buffer = eventBuffers[runId];
    if (!buffer) {
      continue;
    }
    for (const event of buffer.events) {
      if (event.type !== "cost" || !event.cost || typeof event.cost !== "object") {
        continue;
      }
      total += Number((event.cost as { totalUsd?: number }).totalUsd ?? 0);
      found = true;
    }
  }
  return found ? total : null;
}

export default function SessionDetailPage() {
  return (
    <RequireGatewayAuth>
      <SessionDetailContent />
    </RequireGatewayAuth>
  );
}

function SessionDetailContent() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId ?? "";
  const fetchGateway = useGatewayFetch();
  const { store } = useGateway();
  const session = useStore(store, (state) => state.sessions.byId[sessionId] ?? null);
  const runs = useStore(
    store,
    useShallow((state) =>
      Object.values(state.runs.byId)
        .filter((run) => run.sessionId === sessionId)
        .sort((left, right) => Number(right.startedAt ?? 0) - Number(left.startedAt ?? 0)),
    ),
  );
  const eventBuffers = useStore(store, (state) => state.events.byRunId);
  const [prompt, setPrompt] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transcript = useMemo(
    () => buildTranscript(runs as Array<Record<string, unknown>>, eventBuffers),
    [eventBuffers, runs],
  );
  const runIds = useMemo(() => runs.map((run) => String(run.runId ?? "")), [runs]);
  const totalCost = useMemo(() => accumulateEventCost(runIds, eventBuffers), [eventBuffers, runIds]);
  const workspacePath = typeof session?.cwd === "string" && session.cwd.length > 0 ? session.cwd : null;
  const runtime = readRuntime(session?.runtime);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prompt.trim()) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await fetchGateway(`/api/v1/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt,
          agent: typeof session?.agent === "string" ? session.agent : undefined,
        }),
      });
      if (!response.ok) {
        throw new Error(`Gateway request failed: ${response.status}`);
      }
      const body = (await response.json()) as {
        run?: Record<string, unknown>;
        session?: Record<string, unknown>;
      };
      if (body.run?.runId) {
        store.getState().actions.mergeRun(String(body.run.runId), body.run);
      }
      if (body.session?.sessionId) {
        store.getState().actions.mergeSession(String(body.session.sessionId), body.session);
      }
      setPrompt("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSending(false);
    }
  }

  return (
    <SessionWorkspaceShell
      sessionId={sessionId}
      sessionTitle={String(session?.title ?? "Live session transcript")}
      sessionAgent={String(session?.agent ?? "unknown")}
      sessionStatus={String(session?.status ?? "inactive")}
      totalCostLabel={formatUsd(totalCost)}
      runs={runs as Array<Record<string, unknown>>}
      eventBuffers={eventBuffers}
      transcript={transcript}
      workspacePath={workspacePath}
      runtime={runtime}
      prompt={prompt}
      sending={sending}
      error={error}
      onPromptChange={setPrompt}
      onSubmit={handleSubmit}
    />
  );
}
