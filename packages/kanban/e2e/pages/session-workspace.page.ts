import { expect, type Locator, type Page } from "@playwright/test";

export type WorkspacePanelKey = "sidebar" | "conversation" | "context" | "details";

export class SessionWorkspacePage {
  readonly page: Page;
  readonly shell: Locator;
  readonly navbar: Locator;
  readonly desktopPanels: Locator;
  readonly mobilePanelSelector: Locator;
  readonly commandBar: Locator;
  readonly commandBarTrigger: Locator;

  constructor(page: Page) {
    this.page = page;
    this.shell = page.getByTestId("workspace-shell");
    this.navbar = page.getByTestId("workspace-navbar");
    this.desktopPanels = page.getByTestId("workspace-desktop-panels");
    this.mobilePanelSelector = page.getByTestId("workspace-mobile-panel-selector");
    this.commandBar = page.getByTestId("workspace-command-bar");
    this.commandBarTrigger = page.getByTestId("workspace-command-bar-trigger");
  }

  async goto(sessionId: string) {
    await this.page.goto(`/sessions/${sessionId}`, { waitUntil: "domcontentloaded" });
  }

  async waitForData() {
    await expect(this.shell).toBeVisible({ timeout: 60_000 });
    await expect(this.page.getByText("Gateway Required")).toHaveCount(0);
  }

  panel(panel: WorkspacePanelKey): Locator {
    return this.page.getByTestId(`workspace-panel-${panel}`);
  }

  toggle(panel: WorkspacePanelKey): Locator {
    return this.page.getByTestId(`panel-toggle-${panel}`);
  }

  command(panel: WorkspacePanelKey): Locator {
    return this.page.getByTestId(`workspace-command-${panel}`);
  }

  mobilePanel(panel: WorkspacePanelKey): Locator {
    return this.page.getByTestId(`workspace-mobile-panel-${panel}`);
  }

  resizeHandle(leftPanel: WorkspacePanelKey, rightPanel: WorkspacePanelKey): Locator {
    return this.page.getByTestId(`workspace-resize-${leftPanel}-${rightPanel}`);
  }

  async panelWidth(panel: WorkspacePanelKey): Promise<number> {
    const box = await this.panel(panel).boundingBox();
    if (!box) {
      throw new Error(`Panel "${panel}" is not currently rendered`);
    }
    return box.width;
  }

  async dragResizeHandle(
    leftPanel: WorkspacePanelKey,
    rightPanel: WorkspacePanelKey,
    deltaX: number,
  ): Promise<void> {
    const box = await this.resizeHandle(leftPanel, rightPanel).boundingBox();
    if (!box) {
      throw new Error(`Resize handle "${leftPanel}-${rightPanel}" is not currently rendered`);
    }

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(startX + deltaX, startY, { steps: 8 });
    await this.page.mouse.up();
  }
}
