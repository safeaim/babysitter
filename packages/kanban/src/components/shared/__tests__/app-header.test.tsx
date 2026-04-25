import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, setupUser } from "@/test/test-utils";

import { AppHeader } from "../app-header";
import { APP_HEADER_NAV_ITEMS } from "../app-header-nav";

const mockUsePathname = vi.fn(() => "/");
const toggleThemeMock = vi.fn();

vi.mock("next/navigation", async () => {
  const actual = await vi.importActual("next/navigation");
  return { ...actual, usePathname: () => mockUsePathname() };
});

vi.mock("@a5c-ai/compendium", () => ({
  LogoWordmark: (props: Record<string, unknown>) => <div {...props}>Babysitter</div>,
}));

vi.mock("@/components/agent-mux/gateway-provider", () => ({
  useGatewayAuth: () => ({
    isAuthenticated: false,
  }),
}));

vi.mock("@/components/notifications/notification-provider", () => ({
  useNotificationContext: () => ({
    notifications: [],
    dismiss: vi.fn(),
  }),
}));

vi.mock("@/components/notifications/notification-panel", () => ({
  NotificationPanel: () => null,
}));

vi.mock("@/hooks/use-event-stream", () => ({
  useEventStream: () => ({
    connected: true,
  }),
}));

vi.mock("@/hooks/use-keyboard", () => ({
  useKeyboard: () => undefined,
}));

vi.mock("@/components/shared/theme-provider", () => ({
  useTheme: () => ({
    theme: "dark",
    toggle: toggleThemeMock,
  }),
}));

describe("APP_HEADER_NAV_ITEMS", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/");
    toggleThemeMock.mockReset();
  });

  it("includes the dedicated automations surface in the main navigation", () => {
    expect(APP_HEADER_NAV_ITEMS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          href: "/automations",
          label: "Automations",
        }),
      ]),
    );
  });

  it("includes the workspace lifecycle surface in the main navigation", () => {
    expect(APP_HEADER_NAV_ITEMS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          href: "/workspaces",
          label: "Workspaces",
        }),
      ]),
    );
  });

  it("renders settings access, theme toggle, and the main nav links", () => {
    render(<AppHeader />);

    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByTestId("theme-toggle")).toHaveAttribute("aria-label", "Switch to light theme");

    for (const item of APP_HEADER_NAV_ITEMS) {
      expect(screen.getByRole("link", { name: item.label })).toBeInTheDocument();
    }
  });

  it("dispatches the global settings event from the header control", async () => {
    const user = setupUser();
    const handler = vi.fn();
    window.addEventListener("open-settings", handler);

    render(<AppHeader />);
    await user.click(screen.getByRole("button", { name: "Settings" }));

    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener("open-settings", handler);
  });
});
