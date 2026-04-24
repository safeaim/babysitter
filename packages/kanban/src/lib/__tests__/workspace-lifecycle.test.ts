import { beforeEach, describe, expect, it, vi } from "vitest";

import { WorkspaceLifecycleService, type WorkspaceLifecycleDeps, type WorkspaceSessionSnapshot } from "../workspace-lifecycle";
import type { Run } from "@/types";

function createRun(overrides: Partial<Run> = {}): Run {
  return {
    runId: overrides.runId ?? "run-1",
    processId: overrides.processId ?? "process",
    status: overrides.status ?? "waiting",
    createdAt: overrides.createdAt ?? "2026-04-24T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-04-24T01:00:00.000Z",
    sessionId: overrides.sessionId ?? "session-1",
    tasks: overrides.tasks ?? [],
    events: overrides.events ?? [],
    totalTasks: overrides.totalTasks ?? 0,
    completedTasks: overrides.completedTasks ?? 0,
    failedTasks: overrides.failedTasks ?? 0,
  };
}

function createDeps(overrides: Partial<WorkspaceLifecycleDeps> = {}): WorkspaceLifecycleDeps {
  const existingPaths = new Set<string>([
    "/repo/packages/kanban",
    "/repo/main",
    "/repo/worktrees/task",
  ]);

  const registryWrites: string[] = [];
  const execGit = vi.fn<WorkspaceLifecycleDeps["execGit"]>(async (args, cwd) => {
    const key = `${cwd}::${args.join(" ")}`;

    const map: Record<string, { stdout: string; stderr: string }> = {
      "/repo/packages/kanban::rev-parse --show-toplevel": { stdout: "/repo/main\n", stderr: "" },
      "/repo/packages/kanban::rev-parse --path-format=absolute --git-common-dir": { stdout: "/repo/common/.git\n", stderr: "" },
      "/repo/packages/kanban::worktree list --porcelain": {
        stdout: [
          "worktree /repo/main",
          "HEAD abc123",
          "branch refs/heads/main",
          "",
          "worktree /repo/worktrees/task",
          "HEAD def456",
          "branch refs/heads/vk/task",
          "",
        ].join("\n"),
        stderr: "",
      },
      "/repo/main::status --porcelain": { stdout: "", stderr: "" },
      "/repo/worktrees/task::status --porcelain": { stdout: " M packages/kanban/src/app/page.tsx\n", stderr: "" },
      "/repo/main::branch --show-current": { stdout: "main\n", stderr: "" },
      "/repo/worktrees/task::branch --show-current": { stdout: "vk/task\n", stderr: "" },
      "/repo/main::rev-parse HEAD": { stdout: "abc123\n", stderr: "" },
      "/repo/worktrees/task::rev-parse HEAD": { stdout: "def456\n", stderr: "" },
      "/repo/main::worktree add /repo/worktrees/task vk/task": { stdout: "prepared\n", stderr: "" },
      "/repo/main::worktree remove --force /repo/worktrees/task": { stdout: "removed\n", stderr: "" },
      "/repo/main::worktree prune": { stdout: "pruned\n", stderr: "" },
    };

    const value = map[key];
    if (!value) {
      throw new Error(`Unexpected git call: ${key}`);
    }
    return value;
  });

  return {
    discoverAllRunDirs: async () => [
      {
        runDir: "/repo/worktrees/task/.a5c/runs/run-1",
        source: { path: "/repo/worktrees/task", depth: 1 },
        projectName: "task",
      },
    ],
    getRunCached: async () => createRun(),
    readFile: vi.fn(async () => {
      throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    }),
    writeFile: vi.fn(async (_path, contents) => {
      registryWrites.push(String(contents));
    }),
    mkdir: vi.fn(async () => undefined),
    stat: vi.fn(async (targetPath: string) => {
      if (!existingPaths.has(targetPath)) {
        throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      }
      return {} as never;
    }),
    execGit,
    now: () => "2026-04-24T12:00:00.000Z",
    cwd: () => "/repo/packages/kanban",
    ...overrides,
  };
}

describe("WorkspaceLifecycleService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("lists workspaces from git worktrees, agent-mux sessions, and Babysitter runs", async () => {
    const service = new WorkspaceLifecycleService(createDeps());
    const sessions: WorkspaceSessionSnapshot[] = [
      {
        sessionId: "session-1",
        agent: "codex",
        status: "active",
        cwd: "/repo/worktrees/task",
        title: "KANBAN-GAP-003",
        updatedAt: Date.parse("2026-04-24T02:00:00.000Z"),
      },
    ];

    const result = await service.listWorkspaces({ sessions });

    expect(result.summary.total).toBe(2);
    expect(result.summary.active).toBe(1);
    expect(result.workspaces[0]?.path).toBe("/repo/worktrees/task");
    expect(result.workspaces[0]?.runs.active).toBe(1);
    expect(result.workspaces[0]?.sessions.active).toBe(1);
    expect(result.workspaces[0]?.git.branch).toBe("vk/task");
    expect(result.workspaces[0]?.git.dirty).toBe(true);
  });

  it("refuses cleanup for workspaces that are not archived and inactive", async () => {
    const service = new WorkspaceLifecycleService(createDeps());

    await expect(
      service.applyAction({
        action: "cleanup",
        workspacePath: "/repo/worktrees/task",
        sessions: [],
      }),
    ).rejects.toThrow("not eligible for cleanup");
  });

  it("recreates a cleaned workspace during recovery when the path is missing", async () => {
    const deps = createDeps({
      readFile: vi.fn(async () =>
        JSON.stringify({
          version: 1,
          workspaces: {
            "/repo/worktrees/task": {
              path: "/repo/worktrees/task",
              gitRoot: "/repo/main",
              commonDir: "/repo/common/.git",
              branch: "vk/task",
              archivedAt: "2026-04-23T12:00:00.000Z",
              cleanedAt: "2026-04-23T13:00:00.000Z",
            },
          },
        }),
      ),
      stat: vi.fn(async (targetPath: string) => {
        if (targetPath === "/repo/worktrees/task") {
          throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
        }
        return {} as never;
      }),
    });

    const service = new WorkspaceLifecycleService(deps);
    const result = await service.applyAction({
      action: "recover",
      workspacePath: "/repo/worktrees/task",
      sessions: [],
    });

    expect(result.ok).toBe(true);
    expect(deps.execGit).toHaveBeenCalledWith(["worktree", "add", "/repo/worktrees/task", "vk/task"], "/repo/main");
  });
});
