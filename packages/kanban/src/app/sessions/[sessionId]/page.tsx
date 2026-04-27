"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { Attachment, WorkspaceRuntimeSurface } from "@a5c-ai/agent-mux-core";
import { accumulateEventCost } from "@a5c-ai/agent-mux-ui";

import { RequireGatewayAuth } from "@/components/agent-mux/require-gateway-auth";
import { useGatewayFetch } from "@/components/agent-mux/gateway-provider";
import { SessionWorkspaceShell } from "@/components/sessions/session-workspace-shell";
import { useGateway } from "@/lib/agent-mux-ui";

function readRuntime(value: unknown): WorkspaceRuntimeSurface | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  return value as WorkspaceRuntimeSurface;
}

function formatUsd(totalUsd: number | null | undefined): string {
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

export default function SessionDetailPage() {
  return (
    <RequireGatewayAuth>
      <SessionWorkspaceContent />
    </RequireGatewayAuth>
  );
}

function SessionWorkspaceContent() {
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

  const runIds = useMemo(() => runs.map((run) => String(run.runId ?? "")), [runs]);
  const totalCost = useMemo(() => accumulateEventCost(runIds, eventBuffers), [eventBuffers, runIds]);
  const workspacePath = typeof session?.cwd === "string" && session.cwd.length > 0 ? session.cwd : null;
  const runtime = readRuntime(session?.runtime);

  async function handleSubmit(input: {
    sessionId: string;
    prompt: string;
    agent?: string;
    model?: string;
    attachments?: Attachment[];
    approvalMode?: "yolo" | "prompt" | "deny";
  }) {
    const response = await fetchGateway(`/api/v1/sessions/${input.sessionId}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        prompt: input.prompt,
        agent: input.agent,
        model: input.model,
        attachments: input.attachments,
        approvalMode: input.approvalMode,
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
  }

  return (
    <SessionWorkspaceShell
      sessionId={sessionId}
      sessionTitle={typeof session?.title === "string" ? session.title : "Live workspace conversation"}
      sessionAgent={typeof session?.agent === "string" ? session.agent : "unknown"}
      sessionStatus={typeof session?.status === "string" ? session.status : "inactive"}
      sessionModel={typeof session?.model === "string" ? session.model : null}
      totalCostLabel={formatUsd(totalCost?.totalUsd)}
      runs={runs as Array<Record<string, unknown>>}
      eventBuffers={eventBuffers}
      workspacePath={workspacePath}
      runtime={runtime}
      onSubmit={handleSubmit}
    />
  );
}
