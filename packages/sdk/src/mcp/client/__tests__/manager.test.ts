import { describe, it, expect, beforeEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { McpClientManager, type McpClientTransport, type McpTransportFactory } from "../manager";
import { writeMcpServersConfig } from "../config";
import { MCP_SERVERS_SCHEMA_VERSION } from "../types";
import type { McpServerConfig, McpToolInfo, McpToolResult } from "../types";

function createMockTransport(overrides?: Partial<McpClientTransport>): McpClientTransport {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    listTools: vi.fn().mockResolvedValue([]),
    callTool: vi.fn().mockResolvedValue({ success: true, content: [{ type: "text", text: "ok" }] }),
    ...overrides,
  };
}

describe("GAP-REMOTE-006: McpClientManager", () => {
  let stateDir: string;
  let mockFactory: McpTransportFactory;
  let lastTransport: McpClientTransport;

  beforeEach(async () => {
    stateDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-manager-test-"));
    lastTransport = createMockTransport();
    mockFactory = vi.fn().mockImplementation(() => lastTransport);
  });

  async function writeServers(servers: McpServerConfig[]): Promise<void> {
    await writeMcpServersConfig(stateDir, {
      schemaVersion: MCP_SERVERS_SCHEMA_VERSION,
      servers,
    });
  }

  describe("initialize", () => {
    it("loads server configs from disk", async () => {
      await writeServers([
        { name: "s1", transport: "stdio", command: "echo" },
        { name: "s2", transport: "streamable-http", url: "http://localhost" },
      ]);
      const manager = new McpClientManager({ stateDir, transportFactory: mockFactory });
      await manager.initialize();
      expect(manager.initialized).toBe(true);
      const conns = manager.listConnections();
      expect(conns).toHaveLength(2);
      expect(conns.every((c) => c.status === "disconnected")).toBe(true);
    });

    it("auto-connects servers with autoConnect=true", async () => {
      await writeServers([
        { name: "auto", transport: "stdio", command: "echo", autoConnect: true },
        { name: "manual", transport: "stdio", command: "echo" },
      ]);
      const manager = new McpClientManager({ stateDir, transportFactory: mockFactory });
      await manager.initialize(true);
      expect(manager.getConnection("auto")?.status).toBe("connected");
      expect(manager.getConnection("manual")?.status).toBe("disconnected");
    });
  });

  describe("connect", () => {
    it("connects to a named server", async () => {
      await writeServers([{ name: "s1", transport: "stdio", command: "echo" }]);
      const manager = new McpClientManager({ stateDir, transportFactory: mockFactory });
      await manager.initialize();
      const conn = await manager.connect("s1");
      expect(conn.status).toBe("connected");
      expect(conn.connectedAt).toBeTruthy();
      expect(lastTransport.connect).toHaveBeenCalled();
    });

    it("throws for unknown server", async () => {
      await writeServers([]);
      const manager = new McpClientManager({ stateDir, transportFactory: mockFactory });
      await manager.initialize();
      await expect(manager.connect("nonexistent")).rejects.toThrow("not found");
    });

    it("returns existing connection if already connected", async () => {
      await writeServers([{ name: "s1", transport: "stdio", command: "echo" }]);
      const manager = new McpClientManager({ stateDir, transportFactory: mockFactory });
      await manager.initialize();
      await manager.connect("s1");
      const conn2 = await manager.connect("s1");
      expect(conn2.status).toBe("connected");
      // connect() should only be called once
      expect(lastTransport.connect).toHaveBeenCalledTimes(1);
    });

    it("sets error status on connection failure", async () => {
      lastTransport = createMockTransport({
        connect: vi.fn().mockRejectedValue(new Error("connection refused")),
      });
      mockFactory = vi.fn().mockReturnValue(lastTransport);
      await writeServers([{ name: "s1", transport: "stdio", command: "echo" }]);
      const manager = new McpClientManager({ stateDir, transportFactory: mockFactory });
      await manager.initialize();
      await expect(manager.connect("s1")).rejects.toThrow("connection refused");
      expect(manager.getConnection("s1")?.status).toBe("error");
      expect(manager.getConnection("s1")?.error).toBe("connection refused");
    });
  });

  describe("disconnect", () => {
    it("disconnects a connected server", async () => {
      await writeServers([{ name: "s1", transport: "stdio", command: "echo" }]);
      const manager = new McpClientManager({ stateDir, transportFactory: mockFactory });
      await manager.initialize();
      await manager.connect("s1");
      const conn = await manager.disconnect("s1");
      expect(conn.status).toBe("disconnected");
      expect(lastTransport.disconnect).toHaveBeenCalled();
    });

    it("handles disconnect of already-disconnected server gracefully", async () => {
      await writeServers([{ name: "s1", transport: "stdio", command: "echo" }]);
      const manager = new McpClientManager({ stateDir, transportFactory: mockFactory });
      await manager.initialize();
      const conn = await manager.disconnect("s1");
      expect(conn.status).toBe("disconnected");
    });
  });

  describe("disconnectAll", () => {
    it("disconnects all connected servers", async () => {
      await writeServers([
        { name: "s1", transport: "stdio", command: "echo" },
        { name: "s2", transport: "stdio", command: "echo" },
      ]);
      const transports: McpClientTransport[] = [];
      const factory: McpTransportFactory = () => {
        const t = createMockTransport();
        transports.push(t);
        return t;
      };
      const manager = new McpClientManager({ stateDir, transportFactory: factory });
      await manager.initialize();
      await manager.connect("s1");
      await manager.connect("s2");
      await manager.disconnectAll();
      expect(manager.listConnections().every((c) => c.status === "disconnected")).toBe(true);
    });
  });

  describe("listTools", () => {
    it("returns tools from connected server", async () => {
      const tools: McpToolInfo[] = [
        { name: "tool1", description: "A tool", serverName: "s1" },
      ];
      lastTransport = createMockTransport({ listTools: vi.fn().mockResolvedValue(tools) });
      mockFactory = vi.fn().mockReturnValue(lastTransport);
      await writeServers([{ name: "s1", transport: "stdio", command: "echo" }]);
      const manager = new McpClientManager({ stateDir, transportFactory: mockFactory });
      await manager.initialize();
      await manager.connect("s1");
      const result = await manager.listTools("s1");
      expect(result).toEqual(tools);
    });

    it("throws for disconnected server", async () => {
      await writeServers([{ name: "s1", transport: "stdio", command: "echo" }]);
      const manager = new McpClientManager({ stateDir, transportFactory: mockFactory });
      await manager.initialize();
      await expect(manager.listTools("s1")).rejects.toThrow("not connected");
    });
  });

  describe("callTool", () => {
    it("calls tool on connected server", async () => {
      const result: McpToolResult = { success: true, content: [{ type: "text", text: "42" }] };
      lastTransport = createMockTransport({ callTool: vi.fn().mockResolvedValue(result) });
      mockFactory = vi.fn().mockReturnValue(lastTransport);
      await writeServers([{ name: "s1", transport: "stdio", command: "echo" }]);
      const manager = new McpClientManager({ stateDir, transportFactory: mockFactory });
      await manager.initialize();
      await manager.connect("s1");
      const res = await manager.callTool("s1", "add", { a: 1, b: 2 });
      expect(res.success).toBe(true);
    });
  });

  describe("reconnect", () => {
    /** No-op delay for fast tests. */
    const noDelay = async () => {};

    it("retries connection with backoff up to maxReconnectAttempts", async () => {
      let callCount = 0;
      const factory: McpTransportFactory = () => {
        callCount++;
        return createMockTransport({
          connect: vi.fn().mockImplementation(async () => {
            if (callCount < 3) throw new Error("still down");
          }),
        });
      };
      await writeServers([{
        name: "s1", transport: "stdio", command: "echo",
        reconnect: true, maxReconnectAttempts: 3,
      }]);
      const manager = new McpClientManager({ stateDir, transportFactory: factory, delayFn: noDelay });
      await manager.initialize();
      const conn = await manager.reconnect("s1");
      expect(conn.status).toBe("connected");
      expect(conn.reconnectAttempts).toBe(0);
    });

    it("enters error state when all retries exhausted", async () => {
      const factory: McpTransportFactory = () =>
        createMockTransport({
          connect: vi.fn().mockRejectedValue(new Error("permanent failure")),
        });
      await writeServers([{
        name: "s1", transport: "stdio", command: "echo",
        reconnect: true, maxReconnectAttempts: 2,
      }]);
      const manager = new McpClientManager({ stateDir, transportFactory: factory, delayFn: noDelay });
      await manager.initialize();
      const conn = await manager.reconnect("s1");
      expect(conn.status).toBe("error");
      expect(conn.error).toBe("permanent failure");
    });

    it("throws when reconnect is not enabled", async () => {
      await writeServers([{ name: "s1", transport: "stdio", command: "echo" }]);
      const manager = new McpClientManager({ stateDir, transportFactory: mockFactory });
      await manager.initialize();
      await expect(manager.reconnect("s1")).rejects.toThrow("not enabled");
    });

    it("transitions through reconnecting status", async () => {
      const statuses: string[] = [];
      let callCount = 0;
      const factory: McpTransportFactory = () => {
        callCount++;
        return createMockTransport({
          connect: vi.fn().mockImplementation(async () => {
            const conn = manager.getConnection("s1");
            if (conn) statuses.push(conn.status);
            if (callCount < 2) throw new Error("fail");
          }),
        });
      };
      await writeServers([{
        name: "s1", transport: "stdio", command: "echo",
        reconnect: true, maxReconnectAttempts: 2,
      }]);
      const manager = new McpClientManager({ stateDir, transportFactory: factory, delayFn: noDelay });
      await manager.initialize();
      await manager.reconnect("s1");
      expect(statuses).toContain("reconnecting");
    });

    it("deduplicates concurrent reconnect calls", async () => {
      let connectCount = 0;
      const factory: McpTransportFactory = () => {
        connectCount++;
        return createMockTransport();
      };
      await writeServers([{
        name: "s1", transport: "stdio", command: "echo",
        reconnect: true, maxReconnectAttempts: 1,
      }]);
      const manager = new McpClientManager({ stateDir, transportFactory: factory, delayFn: noDelay });
      await manager.initialize();
      const [c1, c2] = await Promise.all([manager.reconnect("s1"), manager.reconnect("s1")]);
      expect(c1.status).toBe("connected");
      expect(c2.status).toBe("connected");
      expect(connectCount).toBe(1);
    });

    it("calls delay function with exponential backoff values", async () => {
      const delays: number[] = [];
      const mockDelay = async (ms: number) => { delays.push(ms); };
      const factory: McpTransportFactory = () =>
        createMockTransport({
          connect: vi.fn()
            .mockRejectedValueOnce(new Error("fail1"))
            .mockRejectedValueOnce(new Error("fail2"))
            .mockResolvedValueOnce(undefined),
        });
      await writeServers([{
        name: "s1", transport: "stdio", command: "echo",
        reconnect: true, maxReconnectAttempts: 3,
      }]);
      const manager = new McpClientManager({ stateDir, transportFactory: factory, delayFn: mockDelay });
      await manager.initialize();
      await manager.reconnect("s1");
      expect(delays).toEqual([1000, 2000, 4000]);
    });
  });

  describe("concurrent connect deduplication", () => {
    it("deduplicates concurrent connect calls", async () => {
      let connectCount = 0;
      const factory: McpTransportFactory = () =>
        createMockTransport({
          connect: vi.fn().mockImplementation(async () => {
            connectCount++;
            await new Promise((r) => setTimeout(r, 50));
          }),
        });
      await writeServers([{ name: "s1", transport: "stdio", command: "echo" }]);
      const manager = new McpClientManager({ stateDir, transportFactory: factory });
      await manager.initialize();
      const [c1, c2] = await Promise.all([manager.connect("s1"), manager.connect("s1")]);
      expect(c1.status).toBe("connected");
      expect(c2.status).toBe("connected");
      expect(connectCount).toBe(1);
    });
  });

  describe("getServerConfig", () => {
    it("returns config for known server", async () => {
      await writeServers([{ name: "s1", transport: "stdio", command: "echo", args: ["-n"] }]);
      const manager = new McpClientManager({ stateDir, transportFactory: mockFactory });
      await manager.initialize();
      const config = manager.getServerConfig("s1");
      expect(config?.command).toBe("echo");
      expect(config?.args).toEqual(["-n"]);
    });

    it("returns undefined for unknown server", async () => {
      await writeServers([]);
      const manager = new McpClientManager({ stateDir, transportFactory: mockFactory });
      await manager.initialize();
      expect(manager.getServerConfig("nope")).toBeUndefined();
    });
  });
});
