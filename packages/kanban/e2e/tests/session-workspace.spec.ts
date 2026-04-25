import { expect, test } from "../fixtures";

const SESSION_ID = "sess-layout-parity";
const GATEWAY_URL = "http://127.0.0.1:7878";
const AUTH_STORAGE_KEY = "babysitter.kanban.gateway-auth";
const MOCK_TOKEN = "test-token";

type SeedOptions = {
  layoutState?: Record<string, unknown>;
};

async function seedWorkspaceState(page: import("@playwright/test").Page, options: SeedOptions = {}): Promise<void> {
  const layoutState = {
    "kanban:workspace-layout.sidebar-open": true,
    "kanban:workspace-layout.conversation-open": true,
    "kanban:workspace-layout.context-open": true,
    "kanban:workspace-layout.details-open": true,
    "kanban:workspace-layout.desktop-sizes": {
      sidebar: 20,
      conversation: 36,
      context: 24,
      details: 20,
    },
    ...options.layoutState,
  };

  await page.addInitScript(
    ({ authStorageKey, gatewayUrl, token, nextLayoutState }) => {
      if (window.localStorage.getItem(authStorageKey) == null) {
        window.localStorage.setItem(authStorageKey, JSON.stringify({ gatewayUrl, token }));
      }
      for (const [key, value] of Object.entries(nextLayoutState)) {
        if (window.localStorage.getItem(key) == null) {
          window.localStorage.setItem(key, JSON.stringify(value));
        }
      }
    },
    {
      authStorageKey: AUTH_STORAGE_KEY,
      gatewayUrl: GATEWAY_URL,
      token: MOCK_TOKEN,
      nextLayoutState: layoutState,
    },
  );
}

test.describe("Session Workspace Layout", () => {
  test("renders the four-panel workspace shell on desktop", async ({ page, sessionWorkspacePage }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await seedWorkspaceState(page);

    await sessionWorkspacePage.goto(SESSION_ID);
    await sessionWorkspacePage.waitForData();

    await expect(sessionWorkspacePage.navbar).toBeVisible();
    await expect(sessionWorkspacePage.desktopPanels).toBeVisible();
    await expect(sessionWorkspacePage.mobilePanelSelector).toHaveCount(0);

    await expect(sessionWorkspacePage.panel("sidebar")).toBeVisible();
    await expect(sessionWorkspacePage.panel("conversation")).toBeVisible();
    await expect(sessionWorkspacePage.panel("context")).toBeVisible();
    await expect(sessionWorkspacePage.panel("details")).toBeVisible();
  });

  test("supports navbar, shortcut, and command-bar toggles with persisted state", async ({
    page,
    sessionWorkspacePage,
  }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await seedWorkspaceState(page);

    await sessionWorkspacePage.goto(SESSION_ID);
    await sessionWorkspacePage.waitForData();

    await sessionWorkspacePage.toggle("sidebar").click();
    await expect(sessionWorkspacePage.panel("sidebar")).toHaveCount(0);

    await sessionWorkspacePage.shell.click();
    await page.keyboard.press("Shift+X");
    await expect(sessionWorkspacePage.panel("context")).toHaveCount(0);

    await page.keyboard.press("Control+K");
    await expect(sessionWorkspacePage.commandBar).toBeVisible();
    await sessionWorkspacePage.command("details").click();
    await expect(sessionWorkspacePage.commandBar).toBeHidden();
    await expect(sessionWorkspacePage.panel("details")).toHaveCount(0);

    await expect(sessionWorkspacePage.panel("conversation")).toBeVisible();
    await expect(sessionWorkspacePage.toggle("conversation")).toHaveAttribute("aria-pressed", "true");

    await page.keyboard.press("Shift+C");
    await expect(sessionWorkspacePage.panel("conversation")).toBeVisible();
    await expect(sessionWorkspacePage.toggle("conversation")).toHaveAttribute("aria-pressed", "true");

    await page.reload({ waitUntil: "domcontentloaded" });
    await sessionWorkspacePage.waitForData();

    await expect(sessionWorkspacePage.panel("sidebar")).toHaveCount(0);
    await expect(sessionWorkspacePage.panel("context")).toHaveCount(0);
    await expect(sessionWorkspacePage.panel("details")).toHaveCount(0);
    await expect(sessionWorkspacePage.panel("conversation")).toBeVisible();
    await expect(sessionWorkspacePage.toggle("conversation")).toHaveAttribute("aria-pressed", "true");
  });

  test("switches to constrained layout and keeps hidden panels out of the selector", async ({
    page,
    sessionWorkspacePage,
  }) => {
    await page.setViewportSize({ width: 1100, height: 900 });
    await seedWorkspaceState(page, {
      layoutState: {
        "kanban:workspace-layout.context-open": false,
        "kanban:workspace-layout.details-open": false,
      },
    });

    await sessionWorkspacePage.goto(SESSION_ID);
    await sessionWorkspacePage.waitForData();

    await expect(sessionWorkspacePage.mobilePanelSelector).toBeVisible();
    await expect(sessionWorkspacePage.desktopPanels).toHaveCount(0);
    await expect(sessionWorkspacePage.mobilePanel("sidebar")).toBeVisible();
    await expect(sessionWorkspacePage.mobilePanel("conversation")).toBeVisible();
    await expect(sessionWorkspacePage.mobilePanel("context")).toHaveCount(0);
    await expect(sessionWorkspacePage.mobilePanel("details")).toHaveCount(0);

    await expect(sessionWorkspacePage.panel("conversation")).toBeVisible();
    await sessionWorkspacePage.mobilePanel("sidebar").click();
    await expect(sessionWorkspacePage.panel("sidebar")).toBeVisible();
    await expect(sessionWorkspacePage.panel("conversation")).toHaveCount(0);
  });

  test("resizes desktop panels and restores the ratios after reload", async ({
    page,
    sessionWorkspacePage,
  }) => {
    await page.setViewportSize({ width: 1600, height: 960 });
    await seedWorkspaceState(page);

    await sessionWorkspacePage.goto(SESSION_ID);
    await sessionWorkspacePage.waitForData();

    const initialSidebarWidth = await sessionWorkspacePage.panelWidth("sidebar");
    const initialConversationWidth = await sessionWorkspacePage.panelWidth("conversation");

    await sessionWorkspacePage.dragResizeHandle("sidebar", "conversation", 160);

    const resizedSidebarWidth = await sessionWorkspacePage.panelWidth("sidebar");
    const resizedConversationWidth = await sessionWorkspacePage.panelWidth("conversation");

    expect(resizedSidebarWidth).toBeGreaterThan(initialSidebarWidth + 40);
    expect(resizedConversationWidth).toBeLessThan(initialConversationWidth - 40);

    await page.reload({ waitUntil: "domcontentloaded" });
    await sessionWorkspacePage.waitForData();

    const restoredSidebarWidth = await sessionWorkspacePage.panelWidth("sidebar");
    const restoredConversationWidth = await sessionWorkspacePage.panelWidth("conversation");

    expect(Math.abs(restoredSidebarWidth - resizedSidebarWidth)).toBeLessThan(40);
    expect(Math.abs(restoredConversationWidth - resizedConversationWidth)).toBeLessThan(40);
  });
});
