import { describe, expect, it, vi } from "vitest";

import { render, screen, within } from "@/test/test-utils";

import SettingsPage from "../page";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: unknown }) => <a href={href}>{children}</a>,
}));

vi.mock("@a5c-ai/compendium", () => ({
  LogoWordmark: (props: Record<string, unknown>) => <div {...props}>Babysitter</div>,
}));

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
    snapshot: {
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
              prerequisites: [
                { key: "github-auth", label: "GitHub auth", satisfied: true },
              ],
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
            renderedContext: "Tests First: Write or update deterministic verification before editing runtime code.",
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
    },
  }),
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

  it("renders integration setup guidance and blocked action states", () => {
    render(<SettingsPage />);

    const integrationSection = screen.getByTestId("integration-settings");
    expect(within(integrationSection).getByText("Repository integrations")).toBeInTheDocument();
    expect(within(integrationSection).getByText("GitHub")).toBeInTheDocument();
    expect(within(integrationSection).getByText("Azure Repos")).toBeInTheDocument();
    expect(within(integrationSection).getByText("partial setup")).toBeInTheDocument();
    expect(within(integrationSection).getByText("Missing scopes: code:write")).toBeInTheDocument();
    expect(within(integrationSection).getByText(/Blocked actions: create linked PRs/)).toBeInTheDocument();
    expect(within(integrationSection).getByText("Pick the project that owns the target repo.")).toBeInTheDocument();
  });
});
