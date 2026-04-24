import { describe, expect, it } from "vitest";

import { APP_HEADER_NAV_ITEMS } from "../app-header-nav";

describe("APP_HEADER_NAV_ITEMS", () => {
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
});
