import { test as base } from "@playwright/test";
import { DashboardPage } from "../pages/dashboard.page";
import { RunDetailPage } from "../pages/run-detail.page";
import { SessionWorkspacePage } from "../pages/session-workspace.page";

/**
 * Extended Playwright test fixtures that provide pre-constructed
 * page objects for the kanban dashboard.
 *
 * Usage:
 *   import { test, expect } from "../fixtures";
 *
 *   test("dashboard loads", async ({ dashboardPage }) => {
 *     await dashboardPage.goto();
 *     await dashboardPage.waitForData();
 *   });
 */
type KanbanFixtures = {
  dashboardPage: DashboardPage;
  runDetailPage: RunDetailPage;
  sessionWorkspacePage: SessionWorkspacePage;
};

export const test = base.extend<KanbanFixtures>({
  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },
  runDetailPage: async ({ page }, use) => {
    const runDetailPage = new RunDetailPage(page);
    await use(runDetailPage);
  },
  sessionWorkspacePage: async ({ page }, use) => {
    const sessionWorkspacePage = new SessionWorkspacePage(page);
    await use(sessionWorkspacePage);
  },
});

export { expect } from "@playwright/test";
