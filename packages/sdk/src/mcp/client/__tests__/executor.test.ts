import { describe, it, expect, beforeEach, vi } from "vitest";
import { McpToolExecutor } from "../executor";
import { McpClientManager } from "../manager";
import type { McpToolResult } from "../types";

function createStubManager(
  callToolImpl: (server: string, tool: string, args: Record<string, unknown>) => Promise<McpToolResult>,
): McpClientManager {
  return {
    callTool: vi.fn().mockImplementation(callToolImpl),
  } as unknown as McpClientManager;
}

describe("GAP-TOOLS-025: McpToolExecutor", () => {
  describe("execute", () => {
    it("returns successful result with duration", async () => {
      const manager = createStubManager(async () => ({
        success: true,
        content: [{ type: "text", text: "42" }],
      }));
      const executor = new McpToolExecutor(manager);
      const result = await executor.execute({
        serverName: "s1",
        toolName: "add",
        args: { a: 1, b: 2 },
      });
      expect(result.success).toBe(true);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.content[0].text).toBe("42");
    });

    it("returns error result on failure", async () => {
      const manager = createStubManager(async () => {
        throw new Error("server crashed");
      });
      const executor = new McpToolExecutor(manager);
      const result = await executor.execute({
        serverName: "s1",
        toolName: "crash",
        args: {},
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("server crashed");
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("executeByQualifiedName", () => {
    it("parses server:tool format and executes", async () => {
      const manager = createStubManager(async (_s, _t, _a) => ({
        success: true,
        content: [{ type: "text", text: "ok" }],
      }));
      const executor = new McpToolExecutor(manager);
      const result = await executor.executeByQualifiedName("myserver:mytool", { x: 1 });
      expect(result.success).toBe(true);
      expect(manager.callTool).toHaveBeenCalledWith("myserver", "mytool", { x: 1 });
    });

    it("returns error for invalid qualified name", async () => {
      const manager = createStubManager(async () => ({ success: true, content: [] }));
      const executor = new McpToolExecutor(manager);
      const result = await executor.executeByQualifiedName("no-colon", {});
      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid qualified tool name");
    });
  });
});
