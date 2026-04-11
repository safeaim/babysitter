import { describe, it, expect, beforeEach, vi } from "vitest";
import { McpToolRegistry } from "../toolRegistry";
import { McpClientManager, type McpClientTransport } from "../manager";
import type { McpToolInfo, McpServerConnection } from "../types";

/** Stub manager that bypasses file I/O. */
function createStubManager(
  connections: McpServerConnection[],
  toolsByServer: Record<string, McpToolInfo[]>,
): McpClientManager {
  const manager = {
    listConnections: () => connections,
    listTools: vi.fn().mockImplementation((serverName: string) => {
      const tools = toolsByServer[serverName];
      if (!tools) throw new Error(`not connected: ${serverName}`);
      return Promise.resolve(tools);
    }),
  } as unknown as McpClientManager;
  return manager;
}

describe("GAP-TOOLS-025: McpToolRegistry", () => {
  const connectedServer = (name: string): McpServerConnection => ({
    name,
    status: "connected",
    lastStatusChange: new Date().toISOString(),
    reconnectAttempts: 0,
  });

  const tool = (name: string, desc: string, server: string): McpToolInfo => ({
    name,
    description: desc,
    serverName: server,
  });

  describe("refreshAll", () => {
    it("indexes tools from all connected servers", async () => {
      const manager = createStubManager(
        [connectedServer("s1"), connectedServer("s2")],
        {
          s1: [tool("read", "Read a file", "s1")],
          s2: [tool("write", "Write a file", "s2"), tool("exec", "Execute cmd", "s2")],
        },
      );
      const registry = new McpToolRegistry(manager);
      const count = await registry.refreshAll();
      expect(count).toBe(3);
      expect(registry.cachedToolCount).toBe(3);
    });

    it("skips disconnected servers", async () => {
      const disconnected: McpServerConnection = {
        name: "offline",
        status: "disconnected",
        lastStatusChange: new Date().toISOString(),
        reconnectAttempts: 0,
      };
      const manager = createStubManager(
        [connectedServer("s1"), disconnected],
        { s1: [tool("t1", "desc", "s1")] },
      );
      const registry = new McpToolRegistry(manager);
      const count = await registry.refreshAll();
      expect(count).toBe(1);
    });
  });

  describe("searchTools", () => {
    it("finds tools by name substring", async () => {
      const manager = createStubManager(
        [connectedServer("s1")],
        { s1: [tool("file_read", "Read files", "s1"), tool("file_write", "Write files", "s1"), tool("bash", "Run bash", "s1")] },
      );
      const registry = new McpToolRegistry(manager);
      await registry.refreshAll();
      const results = registry.searchTools("file");
      expect(results).toHaveLength(2);
      expect(results.map((t) => t.name)).toContain("file_read");
      expect(results.map((t) => t.name)).toContain("file_write");
    });

    it("finds tools by description substring", async () => {
      const manager = createStubManager(
        [connectedServer("s1")],
        { s1: [tool("t1", "Read files from disk", "s1"), tool("t2", "Send email", "s1")] },
      );
      const registry = new McpToolRegistry(manager);
      await registry.refreshAll();
      const results = registry.searchTools("email");
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("t2");
    });

    it("is case-insensitive", async () => {
      const manager = createStubManager(
        [connectedServer("s1")],
        { s1: [tool("ReadFile", "Reads a FILE", "s1")] },
      );
      const registry = new McpToolRegistry(manager);
      await registry.refreshAll();
      expect(registry.searchTools("readfile")).toHaveLength(1);
      expect(registry.searchTools("READFILE")).toHaveLength(1);
    });
  });

  describe("getToolByQualifiedName", () => {
    it("finds tool by server:tool format", async () => {
      const manager = createStubManager(
        [connectedServer("s1"), connectedServer("s2")],
        {
          s1: [tool("read", "Read v1", "s1")],
          s2: [tool("read", "Read v2", "s2")],
        },
      );
      const registry = new McpToolRegistry(manager);
      await registry.refreshAll();
      const t = registry.getToolByQualifiedName("s2:read");
      expect(t?.serverName).toBe("s2");
    });

    it("finds unqualified tool across servers", async () => {
      const manager = createStubManager(
        [connectedServer("s1")],
        { s1: [tool("unique_tool", "desc", "s1")] },
      );
      const registry = new McpToolRegistry(manager);
      await registry.refreshAll();
      const t = registry.getToolByQualifiedName("unique_tool");
      expect(t).toBeDefined();
      expect(t?.name).toBe("unique_tool");
    });

    it("returns undefined for missing tool", async () => {
      const manager = createStubManager([connectedServer("s1")], { s1: [] });
      const registry = new McpToolRegistry(manager);
      await registry.refreshAll();
      expect(registry.getToolByQualifiedName("nonexistent")).toBeUndefined();
    });
  });

  describe("getToolsForServer", () => {
    it("returns cached tools for a server", async () => {
      const manager = createStubManager(
        [connectedServer("s1")],
        { s1: [tool("t1", "d1", "s1"), tool("t2", "d2", "s1")] },
      );
      const registry = new McpToolRegistry(manager);
      await registry.refreshAll();
      expect(registry.getToolsForServer("s1")).toHaveLength(2);
    });

    it("returns empty for unknown server", () => {
      const manager = createStubManager([], {});
      const registry = new McpToolRegistry(manager);
      expect(registry.getToolsForServer("nope")).toEqual([]);
    });
  });

  describe("cache TTL", () => {
    it("respects cacheTtlMs expiration", async () => {
      const manager = createStubManager(
        [connectedServer("s1")],
        { s1: [tool("t1", "d1", "s1")] },
      );
      const registry = new McpToolRegistry(manager, { cacheTtlMs: 1 });
      await registry.refreshAll();
      // Wait for cache to expire
      await new Promise((r) => setTimeout(r, 10));
      expect(registry.getAllTools()).toEqual([]);
    });
  });

  describe("clearCache", () => {
    it("removes all cached tools", async () => {
      const manager = createStubManager(
        [connectedServer("s1")],
        { s1: [tool("t1", "d1", "s1")] },
      );
      const registry = new McpToolRegistry(manager);
      await registry.refreshAll();
      expect(registry.cachedToolCount).toBe(1);
      registry.clearCache();
      expect(registry.cachedToolCount).toBe(0);
    });
  });
});
