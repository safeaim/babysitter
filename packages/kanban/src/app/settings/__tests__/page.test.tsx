import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { render, screen, setupUser, waitFor, within } from "@/test/test-utils";

import SettingsPage from "../page";

const loadTaskTagsMock = vi.fn();
const createTaskTagMock = vi.fn();
const updateTaskTagMock = vi.fn();
const deleteTaskTagMock = vi.fn();
const createDispatchContextLabelMock = vi.fn();
const updateDispatchContextLabelMock = vi.fn();
const deleteDispatchContextLabelMock = vi.fn();
const refreshMock = vi.fn();

let snapshot = {
  projects: [
    {
      id: "kanban-app",
      team: {
        name: "Kanban Core",
        members: [
          { id: "tal", displayName: "Tal Muskal", email: "tal@a5c.ai", role: "owner" },
          { id: "qa", displayName: "QA Lead", email: "qa@a5c.ai", role: "maintainer" },
        ],
        settings: {
          visibility: "team",
          defaultRole: "contributor",
        },
      },
      settings: {
        workspaceProvisioning: "owners-maintainers",
      },
      integrations: [
        {
          provider: "github",
          label: "GitHub",
          status: "connected",
          accountLabel: "a5c-ai",
          guidance: "GitHub is ready for linked PR flows.",
          prerequisites: [{ key: "github-auth", label: "GitHub auth", satisfied: true }],
          actions: {
            canCreatePullRequest: true,
            canManagePullRequest: true,
            canApproveFromReview: true,
          },
        },
        {
          provider: "azure-repos",
          label: "Azure Repos",
          status: "partial-setup",
          accountLabel: "Boards Platform",
          guidance: "Complete Azure project binding before linked PR actions can be enabled.",
          missingScopes: ["code:write"],
          prerequisites: [
            { key: "azure-auth", label: "Azure auth", satisfied: true },
            {
              key: "azure-project",
              label: "Default project selected",
              satisfied: false,
              guidance: "Pick the project that owns the target repo.",
            },
          ],
          actions: {
            canCreatePullRequest: false,
            canManagePullRequest: false,
            canApproveFromReview: false,
            reason: "Azure Repos setup is incomplete.",
          },
        },
      ],
      permissions: [
        {
          action: "manage-project-settings",
          description: "Elevated roles only.",
          roles: ["owner", "maintainer"],
        },
      ],
      activity: [
        {
          id: "activity-1",
          actor: { displayName: "Tal Muskal" },
          createdAt: "2026-04-24T12:00:00.000Z",
          summary: "Updated shared team settings, roster, and permission policy.",
        },
      ],
    },
  ],
  dispatchContextLabels: [
    {
      id: "dispatch-context-label-1",
      key: "tests_first",
      label: "Tests First",
      description: "Keep verification ahead of implementation.",
      instruction: "Write or update deterministic verification before editing runtime code.",
    },
  ],
  issues: [
    {
      id: "issue-1",
      key: "KANBAN-GAP-004",
      dispatch: {
        contextLabels: [{ labelId: "dispatch-context-label-1" }],
        renderedContext:
          "Tests First: Write or update deterministic verification before editing runtime code.",
      },
    },
    {
      id: "issue-2",
      key: "KANBAN-GAP-099",
      dispatch: {
        contextLabels: [],
        renderedContext: "",
      },
    },
  ],
};

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href?: string;
    children?: unknown;
    [key: string]: unknown;
  }) => (
    <a href={typeof href === "string" ? href : "#"} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@a5c-ai/compendium", () => ({
  LogoWordmark: (props: Record<string, unknown>) => <div {...props}>Babysitter</div>,
}));

vi.mock("@/components/ui/button", async () => {
  const React = await import("react");

  return {
    Button: ({
      asChild,
      children,
      ...props
    }: {
      asChild?: boolean;
      children?: React.ReactNode;
      [key: string]: unknown;
    }) =>
      asChild && React.isValidElement(children)
        ? React.cloneElement(children, props)
        : <button {...props}>{children}</button>,
  };
});

vi.mock("lucide-react", () => ({
  Activity: () => <svg aria-hidden="true" />,
  ShieldCheck: () => <svg aria-hidden="true" />,
  Users: () => <svg aria-hidden="true" />,
}));

vi.mock("@/components/agent-mux/gateway-provider", () => ({
  useGatewayAuth: () => ({
    auth: null,
    logout: vi.fn(),
    isAuthenticated: false,
  }),
}));

vi.mock("@/hooks/use-backlog", () => ({
  useBacklog: () => ({
    snapshot,
    refresh: refreshMock,
  }),
  loadTaskTags: (...args: unknown[]) => loadTaskTagsMock(...args),
  createTaskTag: (...args: unknown[]) => createTaskTagMock(...args),
  updateTaskTag: (...args: unknown[]) => updateTaskTagMock(...args),
  deleteTaskTag: (...args: unknown[]) => deleteTaskTagMock(...args),
  createDispatchContextLabel: (...args: unknown[]) => createDispatchContextLabelMock(...args),
  updateDispatchContextLabel: (...args: unknown[]) => updateDispatchContextLabelMock(...args),
  deleteDispatchContextLabel: (...args: unknown[]) => deleteDispatchContextLabelMock(...args),
}));

vi.mock("@/lib/agent-mux-ui", () => ({
  useConnection: () => ({
    status: "disconnected",
    error: null,
  }),
  useGateway: () => ({
    store: {
      getState: () => ({
        agents: { items: [] },
        sessions: { byId: {} },
        runs: { byId: {} },
      }),
      subscribe: () => () => undefined,
    },
  }),
}));

describe("SettingsPage", () => {
  beforeEach(() => {
    loadTaskTagsMock.mockReset();
    createTaskTagMock.mockReset();
    updateTaskTagMock.mockReset();
    deleteTaskTagMock.mockReset();
    createDispatchContextLabelMock.mockReset();
    updateDispatchContextLabelMock.mockReset();
    deleteDispatchContextLabelMock.mockReset();
    refreshMock.mockReset();

    loadTaskTagsMock.mockResolvedValue([
      {
        id: "task-tag-1",
        key: "bug_report",
        label: "Bug Report",
        description: "Capture reproduction steps and impact.",
        content: "Describe the bug, expected behavior, and steps to reproduce.",
        order: 0,
        createdAt: "2026-04-24T12:00:00.000Z",
        updatedAt: "2026-04-24T12:00:00.000Z",
      },
      {
        id: "task-tag-2",
        key: "deployment_validation",
        label: "Deployment Validation",
        description: "Release checklist.",
        content: "Run smoke tests and validate rollback readiness.",
        order: 1,
        createdAt: "2026-04-24T12:00:00.000Z",
        updatedAt: "2026-04-24T12:00:00.000Z",
      },
    ]);
    createDispatchContextLabelMock.mockResolvedValue({ dispatchContextLabels: [] });
    updateDispatchContextLabelMock.mockResolvedValue({ dispatchContextLabels: [] });
    deleteDispatchContextLabelMock.mockResolvedValue({ dispatchContextLabels: [] });
    refreshMock.mockResolvedValue(undefined);
  });

  it("renders collaboration settings from the backlog snapshot", () => {
    render(<SettingsPage />);

    const collaborationSection = screen.getByTestId("collaboration-settings");
    expect(within(collaborationSection).getByText("Team and collaboration")).toBeInTheDocument();
    expect(within(collaborationSection).getByText("Kanban Core (2 members)")).toBeInTheDocument();
    expect(within(collaborationSection).getByText("owners-maintainers")).toBeInTheDocument();
    expect(within(collaborationSection).getByText("manage-project-settings")).toBeInTheDocument();
    expect(
      within(collaborationSection).getByText(
        "Updated shared team settings, roster, and permission policy.",
      ),
    ).toBeInTheDocument();
  });

  it("renders integration setup guidance and blocked action states", () => {
    render(<SettingsPage />);

    const integrationSection = screen.getByTestId("integration-settings");
    expect(within(integrationSection).getByText("Repository integrations")).toBeInTheDocument();
    expect(within(integrationSection).getByText("GitHub")).toBeInTheDocument();
    expect(within(integrationSection).getByText("Azure Repos")).toBeInTheDocument();
    expect(within(integrationSection).getByText("partial setup")).toBeInTheDocument();
    expect(within(integrationSection).getByText("Missing scopes: code:write")).toBeInTheDocument();
    expect(
      within(integrationSection).getByText(/Blocked actions: create linked PRs/),
    ).toBeInTheDocument();
    expect(
      within(integrationSection).getByText("Pick the project that owns the target repo."),
    ).toBeInTheDocument();
  });

  it("loads and renders reusable Task Tags in deterministic order", async () => {
    render(<SettingsPage />);

    const taskTagSection = screen.getByTestId("task-tag-settings");
    await waitFor(() => expect(loadTaskTagsMock).toHaveBeenCalledTimes(1));

    expect(within(taskTagSection).getByText("Task Tags")).toBeInTheDocument();
    expect(within(taskTagSection).getByText("2")).toBeInTheDocument();
    const taskTagCards = within(taskTagSection).getAllByTestId(/task-tag-item-/);
    expect(taskTagCards).toHaveLength(2);
    expect(within(taskTagCards[0]!).getByText("Bug Report")).toBeInTheDocument();
    expect(within(taskTagCards[1]!).getByText("Deployment Validation")).toBeInTheDocument();
  });

  it("validates and creates a new Task Tag from Settings", async () => {
    const user = setupUser();
    createTaskTagMock.mockResolvedValue({
      taskTags: [
        {
          id: "task-tag-1",
          key: "bug_report",
          label: "Bug Report",
          description: "Capture reproduction steps and impact.",
          content: "Describe the bug, expected behavior, and steps to reproduce.",
          order: 0,
          createdAt: "2026-04-24T12:00:00.000Z",
          updatedAt: "2026-04-24T12:00:00.000Z",
        },
        {
          id: "task-tag-3",
          key: "release_notes",
          label: "Release Notes",
          description: "Prepare the release summary.",
          content: "Summarize changes, risk, rollout plan, and rollback plan.",
          order: 1,
          createdAt: "2026-04-24T12:00:00.000Z",
          updatedAt: "2026-04-24T12:00:00.000Z",
        },
      ],
    });

    render(<SettingsPage />);
    await waitFor(() => expect(loadTaskTagsMock).toHaveBeenCalledTimes(1));

    await user.clear(screen.getByLabelText("Task Tag key"));
    await user.type(screen.getByLabelText("Task Tag key"), "Release Notes");
    await user.click(screen.getByRole("button", { name: "Create Task Tag" }));

    expect(
      await screen.findByText("Key must use lowercase snake_case."),
    ).toBeInTheDocument();
    expect(createTaskTagMock).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("Task Tag key"));
    await user.type(screen.getByLabelText("Task Tag key"), "bug_report");
    await user.click(screen.getByRole("button", { name: "Create Task Tag" }));

    expect(await screen.findByText("Key bug_report already exists.")).toBeInTheDocument();
    expect(createTaskTagMock).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("Task Tag key"));
    await user.type(screen.getByLabelText("Task Tag key"), "release_notes");
    await user.type(screen.getByLabelText("Task Tag label"), "Release Notes");
    await user.type(
      screen.getByLabelText("Task Tag description"),
      "Prepare the release summary.",
    );
    await user.type(
      screen.getByLabelText("Task Tag content"),
      "Summarize changes, risk, rollout plan, and rollback plan.",
    );
    await user.click(screen.getByRole("button", { name: "Create Task Tag" }));

    await waitFor(() =>
      expect(createTaskTagMock).toHaveBeenCalledWith({
        key: "release_notes",
        label: "Release Notes",
        description: "Prepare the release summary.",
        content: "Summarize changes, risk, rollout plan, and rollback plan.",
        order: 2,
      }),
    );
    expect(await screen.findByText("Created @release_notes.")).toBeInTheDocument();
    expect(screen.getByText("Release Notes")).toBeInTheDocument();
  });

  it("supports editing, reordering, and deleting Task Tags", async () => {
    const user = setupUser();
    updateTaskTagMock
      .mockResolvedValueOnce({
        taskTags: [
          {
            id: "task-tag-1",
            key: "bug_report",
            label: "Bug Report",
            description: "Capture reproduction steps and impact.",
            content: "Describe the bug, expected behavior, and steps to reproduce.",
            order: 0,
            createdAt: "2026-04-24T12:00:00.000Z",
            updatedAt: "2026-04-24T12:00:00.000Z",
          },
          {
            id: "task-tag-2",
            key: "deployment_validation",
            label: "Ship Validation",
            description: "Release checklist.",
            content: "Run smoke tests and validate rollback readiness.",
            order: 1,
            createdAt: "2026-04-24T12:00:00.000Z",
            updatedAt: "2026-04-24T12:00:00.000Z",
          },
        ],
      })
      .mockResolvedValueOnce({
        taskTags: [
          {
            id: "task-tag-2",
            key: "deployment_validation",
            label: "Ship Validation",
            description: "Release checklist.",
            content: "Run smoke tests and validate rollback readiness.",
            order: 0,
            createdAt: "2026-04-24T12:00:00.000Z",
            updatedAt: "2026-04-24T12:00:00.000Z",
          },
          {
            id: "task-tag-1",
            key: "bug_report",
            label: "Bug Report",
            description: "Capture reproduction steps and impact.",
            content: "Describe the bug, expected behavior, and steps to reproduce.",
            order: 1,
            createdAt: "2026-04-24T12:00:00.000Z",
            updatedAt: "2026-04-24T12:00:00.000Z",
          },
        ],
      })
      .mockResolvedValueOnce({
        taskTags: [
          {
            id: "task-tag-2",
            key: "deployment_validation",
            label: "Ship Validation",
            description: "Release checklist.",
            content: "Run smoke tests and validate rollback readiness.",
            order: 0,
            createdAt: "2026-04-24T12:00:00.000Z",
            updatedAt: "2026-04-24T12:00:00.000Z",
          },
          {
            id: "task-tag-1",
            key: "bug_report",
            label: "Bug Report",
            description: "Capture reproduction steps and impact.",
            content: "Describe the bug, expected behavior, and steps to reproduce.",
            order: 1,
            createdAt: "2026-04-24T12:00:00.000Z",
            updatedAt: "2026-04-24T12:00:00.000Z",
          },
        ],
      });
    deleteTaskTagMock.mockResolvedValue({
      taskTags: [
        {
          id: "task-tag-2",
          key: "deployment_validation",
          label: "Ship Validation",
          description: "Release checklist.",
          content: "Run smoke tests and validate rollback readiness.",
          order: 0,
          createdAt: "2026-04-24T12:00:00.000Z",
          updatedAt: "2026-04-24T12:00:00.000Z",
        },
      ],
    });

    render(<SettingsPage />);
    await waitFor(() => expect(loadTaskTagsMock).toHaveBeenCalledTimes(1));

    await user.click(screen.getAllByRole("button", { name: "Edit" })[1]!);
    const labelInput = screen.getByLabelText("Task Tag label");
    await user.clear(labelInput);
    await user.type(labelInput, "Ship Validation");
    await user.click(screen.getByRole("button", { name: "Save Task Tag" }));

    await waitFor(() =>
      expect(updateTaskTagMock).toHaveBeenNthCalledWith(
        1,
        "task-tag-2",
        expect.objectContaining({ label: "Ship Validation" }),
      ),
    );
    expect(await screen.findByText("Updated @deployment_validation.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Move Ship Validation up" }));
    await waitFor(() =>
      expect(updateTaskTagMock).toHaveBeenNthCalledWith(2, "task-tag-2", { order: 0 }),
    );
    await waitFor(() =>
      expect(updateTaskTagMock).toHaveBeenNthCalledWith(3, "task-tag-1", { order: 1 }),
    );
    expect(await screen.findByText("Updated Task Tag order.")).toBeInTheDocument();

    await user.click(
      within(screen.getByTestId("task-tag-item-task-tag-1")).getByRole("button", {
        name: "Delete",
      }),
    );
    await waitFor(() => expect(deleteTaskTagMock).toHaveBeenCalledWith("task-tag-1"));
    expect(await screen.findByText("Deleted @bug_report.")).toBeInTheDocument();
  });

  it("renders dispatch context label definitions and attached issue projections", () => {
    render(<SettingsPage />);

    const dispatchSection = screen.getByTestId("dispatch-context-label-settings");
    expect(within(dispatchSection).getByText("Dispatch Context Labels")).toBeInTheDocument();
    expect(within(dispatchSection).getByText("Tests First")).toBeInTheDocument();
    expect(within(dispatchSection).getByText("tests_first")).toBeInTheDocument();
    expect(within(dispatchSection).getByText("1 issue")).toBeInTheDocument();
    expect(
      within(dispatchSection).getByText(
        "Write or update deterministic verification before editing runtime code.",
      ),
    ).toBeInTheDocument();
    expect(within(dispatchSection).getByText("KANBAN-GAP-004")).toBeInTheDocument();
  });

  it("creates a reusable dispatch context label definition", async () => {
    const user = setupUser();
    render(<SettingsPage />);

    await user.type(screen.getByLabelText("Dispatch Context Label key"), "ui_copy_review");
    await user.type(screen.getByLabelText("Dispatch Context Label name"), "UI Copy Review");
    await user.type(
      screen.getByLabelText("Dispatch Context Label description"),
      "Prompt a copy pass before shipping text changes.",
    );
    await user.type(
      screen.getByLabelText("Dispatch Context Label instruction"),
      "Review user-facing strings before finalizing the change.",
    );
    await user.click(screen.getByRole("button", { name: "Create Dispatch Context Label" }));

    expect(createDispatchContextLabelMock).toHaveBeenCalledWith({
      key: "ui_copy_review",
      label: "UI Copy Review",
      description: "Prompt a copy pass before shipping text changes.",
      instruction: "Review user-facing strings before finalizing the change.",
    });
    expect(refreshMock).toHaveBeenCalled();
    expect(screen.getByText("Created Dispatch Context Label definition.")).toBeInTheDocument();
  });

  it("edits an existing reusable dispatch context label definition", async () => {
    const user = setupUser();
    render(<SettingsPage />);

    await user.click(screen.getByRole("button", { name: "Edit definition" }));
    await user.clear(screen.getByLabelText("Dispatch Context Label name tests_first"));
    await user.type(
      screen.getByLabelText("Dispatch Context Label name tests_first"),
      "Tests Before Code",
    );
    await user.click(screen.getByRole("button", { name: "Save definition" }));

    expect(updateDispatchContextLabelMock).toHaveBeenCalledWith(
      "dispatch-context-label-1",
      {
        key: "tests_first",
        label: "Tests Before Code",
        description: "Keep verification ahead of implementation.",
        instruction: "Write or update deterministic verification before editing runtime code.",
      },
    );
    expect(refreshMock).toHaveBeenCalled();
    expect(screen.getByText("Updated Dispatch Context Label definition.")).toBeInTheDocument();
  });

  it("deletes a reusable dispatch context label definition", async () => {
    const user = setupUser();
    render(<SettingsPage />);

    await user.click(screen.getByRole("button", { name: "Delete definition" }));

    expect(deleteDispatchContextLabelMock).toHaveBeenCalledWith(
      "dispatch-context-label-1",
    );
    expect(refreshMock).toHaveBeenCalled();
    expect(screen.getByText("Deleted Dispatch Context Label definition.")).toBeInTheDocument();
  });
});
