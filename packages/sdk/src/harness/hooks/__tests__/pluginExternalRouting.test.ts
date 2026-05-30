import { describe, expect, it } from "vitest";

/**
 * These tests verify routing classification WITHOUT importing from
 * @a5c-ai/tasks-mux at the module level — vitest thread pooling can
 * leak vi.mock overrides from other test files. Instead we dynamically
 * require the real module at test time.
 */

async function loadRealTasksMux() {
  const modulePath = require.resolve("@a5c-ai/tasks-mux");
  delete require.cache[modulePath];
  return require(modulePath) as {
    routeTask: (task: unknown, context?: unknown) => Record<string, unknown>;
    isHostDelegableRoute: (decision: unknown) => boolean;
  };
}

describe("plugin tasks-mux external routing classification", () => {
  it("keeps agent responder effects inside tasks-mux so plugin mode can resolve them internally", async () => {
    const { routeTask, isHostDelegableRoute } = await loadRealTasksMux();
    const decision = routeTask(
      {
        kind: "agent",
        agent: {
          responderType: "agent",
          adapter: "codex",
          prompt: { task: "review" },
        },
      },
      {
        responders: [{
          id: "codex",
          type: "agent",
          name: "Codex",
          title: "Codex",
          domains: [],
          tags: [],
          availability: true,
          responseTimeSla: 1000,
          adapter: "codex",
        }],
      },
    );

    expect(decision).toMatchObject({
      responderType: "agent",
      route: "agent-mux",
    });
    expect(decision.responderType).not.toBe("internal");
    expect(isHostDelegableRoute(decision)).toBe(false);
  });

  it("classifies tracker responder effects as externally waiting when no tracker backend is available", async () => {
    const { routeTask, isHostDelegableRoute } = await loadRealTasksMux();
    const decision = routeTask({
      kind: "agent",
      metadata: {
        responderType: "tracker",
        trackerBackend: "linear",
      },
    });

    expect(decision).toMatchObject({
      responderType: "tracker",
      route: "external-tracker",
      unavailable: true,
    });
    expect(isHostDelegableRoute(decision)).toBe(false);
  });
});
