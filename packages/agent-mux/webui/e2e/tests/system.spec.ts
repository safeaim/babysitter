import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const stateFile = path.resolve(__dirname, "../../.tmp/amux-webui-e2e-state.json");

type FixtureState = {
  baseUrl: string;
  adminUsername: string;
  adminPassword: string;
  sessionId: string;
  issueId: string;
  issueKey: string;
  workspacePath: string;
  transcriptText: string;
};

let cachedState: FixtureState | null = null;

async function readFixtureState(): Promise<FixtureState> {
  if (cachedState) {
    return cachedState;
  }

  const startedAt = Date.now();
  while (Date.now() - startedAt < 30_000) {
    try {
      const raw = await fs.readFile(stateFile, "utf8");
      cachedState = JSON.parse(raw) as FixtureState;
      return cachedState;
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code !== "ENOENT") {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  throw new Error(`Timed out waiting for fixture state at ${stateFile}.`);
}

async function authenticatePage(page: Page, request: APIRequestContext) {
  const state = await readFixtureState();
  const response = await request.post(`${state.baseUrl}/api/v1/bootstrap/login`, {
    data: {
      username: state.adminUsername,
      password: state.adminPassword,
      clientName: "playwright-webui-e2e",
    },
  });
  expect(response.ok()).toBeTruthy();

  const payload = (await response.json()) as {
    issuedToken: {
      plaintext: string;
    };
  };
  const auth = {
    gatewayUrl: state.baseUrl,
    token: payload.issuedToken.plaintext,
  };

  await page.addInitScript((input) => {
    window.localStorage.setItem("amux.webui.auth", JSON.stringify(input));
  }, auth);
}

test.describe("agent-mux webui e2e", () => {
  test("workspaces remains usable without gateway auth", async ({ page }) => {
    await page.goto("/workspaces", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL(/\/workspaces$/);
    await expect(page.getByTestId("workspace-sidebar-surface")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Find the right workspace and jump back into the session" })).toBeVisible();
  });

  test.describe("authenticated surfaces", () => {
    test.beforeEach(async ({ page, request }) => {
      await authenticatePage(page, request);
    });

    test("board uses the available width and keeps heavy details collapsed until requested", async ({ page }) => {
      const state = await readFixtureState();
      await page.goto("/projects/kanban-app/board", { waitUntil: "domcontentloaded" });

      const board = page.getByTestId("kanban-board");
      await expect(board).toBeVisible();

      const viewport = page.viewportSize();
      const appContent = page.locator(".app-content");
      const appContentBox = await appContent.boundingBox();
      const boardBox = await board.boundingBox();
      expect(appContentBox).not.toBeNull();
      expect(boardBox).not.toBeNull();
      expect(viewport).not.toBeNull();
      expect(appContentBox!.width / viewport!.width).toBeGreaterThan(0.68);
      expect(boardBox!.width / viewport!.width).toBeGreaterThan(0.58);
      expect(boardBox!.width / appContentBox!.width).toBeGreaterThan(0.85);

      const swimlane = page.locator('[data-testid^="kanban-swimlane-"]').first();
      await expect(swimlane).toBeVisible();
      const columns = swimlane.locator('[data-testid^="kanban-column-"]');
      await expect(columns).toHaveCount(4);
      const firstFourBoxes = await Promise.all(
        [0, 1, 2, 3].map(async (index) => await columns.nth(index).boundingBox()),
      );
      for (const box of firstFourBoxes) {
        expect(box).not.toBeNull();
      }
      expect(firstFourBoxes[1]!.x).toBeGreaterThan(firstFourBoxes[0]!.x);
      expect(firstFourBoxes[2]!.x).toBeGreaterThan(firstFourBoxes[1]!.x);
      expect(firstFourBoxes[3]!.x).toBeGreaterThan(firstFourBoxes[2]!.x);

      await expect(page.getByTestId("board-controls-details")).toBeVisible();

      const linkedCard = page.getByTestId(`kanban-card-${state.issueKey}`);
      await expect(linkedCard).toBeVisible();
      await expect(linkedCard.getByText("Repository lifecycle")).not.toBeVisible();
      await linkedCard.locator("details summary").click();
      await expect(linkedCard.getByText("Repository lifecycle")).toBeVisible();
    });

    test("board workspace links keep issue association visible and hand off cleanly into the linked session chat", async ({ page }) => {
      const state = await readFixtureState();
      await page.goto("/projects/kanban-app/board", { waitUntil: "domcontentloaded" });

      const linkedCard = page.getByTestId(`kanban-card-${state.issueKey}`);
      await expect(linkedCard).toBeVisible();
      await linkedCard.locator(`[data-testid^="card-workspace-${state.issueKey}-"]`).click();

      await expect(page).toHaveURL(new RegExp(`/workspaces\\?workspace=${encodeURIComponent(state.workspacePath)}`));
      await expect(page.getByTestId("workspace-shell")).toBeVisible();
      await expect(page.getByTestId(`workspace-primary-issue-link-${state.issueKey}`)).toBeVisible();
      await expect(page.getByTestId("workspace-session-select")).toBeVisible();
      const viewSessionButton = page.getByRole("button", { name: "View session", exact: true }).first();
      await expect(viewSessionButton).toBeVisible();
      await expect(page.getByTestId("workspace-context-bar")).toContainText(state.issueKey);

      await viewSessionButton.click();

      await expect(page).toHaveURL(new RegExp(`/sessions/${state.sessionId}$`));
      await expect(page.getByTestId("workspace-panel-conversation")).toBeVisible();
      await expect(page.getByText(state.transcriptText)).toBeVisible();
    });

    test("session detail stays chat-first and keeps workspace context beside the transcript", async ({ page }) => {
      const state = await readFixtureState();
      await page.goto(`/sessions/${state.sessionId}`, { waitUntil: "domcontentloaded" });

      await expect(page.getByTestId("workspace-shell")).toBeVisible();
      await expect(page.getByTestId("workspace-desktop-panels")).toBeVisible();
      await expect(page.getByTestId("workspace-panel-conversation")).toBeVisible();
      await expect(page.getByText(state.transcriptText)).toBeVisible();
      await expect(page.getByText("This route is now chat-first. Keep the live conversation visible while execution context, run history, and runtime details stay alongside it instead of hiding behind secondary tabs.")).toBeVisible();
      await expect(page.getByTestId("workspace-panel-sidebar").getByRole("button", { name: "Open workspace" })).toBeVisible();
      await expect(page.getByPlaceholder("Continue the session...")).toBeEnabled();
      await expect(page.getByTestId("panel-toggle-sidebar")).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByTestId("panel-toggle-conversation")).toHaveAttribute("aria-pressed", "true");

      const shellBox = await page.getByTestId("workspace-shell").boundingBox();
      const desktopPanelsBox = await page.getByTestId("workspace-desktop-panels").boundingBox();
      const viewport = page.viewportSize();
      expect(shellBox).not.toBeNull();
      expect(desktopPanelsBox).not.toBeNull();
      expect(viewport).not.toBeNull();
      expect(shellBox!.width / viewport!.width).toBeGreaterThan(0.65);
      expect(desktopPanelsBox!.width / shellBox!.width).toBeGreaterThan(0.9);
    });
  });
});
