import { describe, it, expect, beforeEach } from "vitest";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  getMcpServersConfigPath,
  readMcpServersConfig,
  writeMcpServersConfig,
  upsertServerConfig,
  removeServerConfig,
  mergeMcpServersConfig,
} from "../config";
import { MCP_SERVERS_SCHEMA_VERSION } from "../types";
import type { McpServerConfig, McpServersFile } from "../types";

describe("GAP-REMOTE-006: MCP Server Config", () => {
  let stateDir: string;

  beforeEach(async () => {
    stateDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-config-test-"));
  });

  describe("getMcpServersConfigPath", () => {
    it("returns path under stateDir", () => {
      const p = getMcpServersConfigPath("/some/dir");
      expect(p).toBe(path.join("/some/dir", "mcp-servers.json"));
    });
  });

  describe("readMcpServersConfig", () => {
    it("returns empty servers when file does not exist", async () => {
      const config = await readMcpServersConfig(stateDir);
      expect(config.schemaVersion).toBe(MCP_SERVERS_SCHEMA_VERSION);
      expect(config.servers).toEqual([]);
    });

    it("returns empty servers on corrupt JSON", async () => {
      await fs.writeFile(getMcpServersConfigPath(stateDir), "{bad", "utf8");
      const config = await readMcpServersConfig(stateDir);
      expect(config.servers).toEqual([]);
    });

    it("reads valid config file", async () => {
      const data: McpServersFile = {
        schemaVersion: MCP_SERVERS_SCHEMA_VERSION,
        servers: [{ name: "test", transport: "stdio", command: "echo" }],
      };
      await fs.writeFile(getMcpServersConfigPath(stateDir), JSON.stringify(data), "utf8");
      const config = await readMcpServersConfig(stateDir);
      expect(config.servers).toHaveLength(1);
      expect(config.servers[0].name).toBe("test");
    });
  });

  describe("writeMcpServersConfig", () => {
    it("creates file atomically", async () => {
      const data: McpServersFile = {
        schemaVersion: MCP_SERVERS_SCHEMA_VERSION,
        servers: [{ name: "s1", transport: "stdio", command: "node" }],
      };
      await writeMcpServersConfig(stateDir, data);
      const raw = await fs.readFile(getMcpServersConfigPath(stateDir), "utf8");
      const parsed = JSON.parse(raw) as McpServersFile;
      expect(parsed.servers[0].name).toBe("s1");
    });
  });

  describe("upsertServerConfig", () => {
    it("adds new server", async () => {
      const server: McpServerConfig = { name: "new-server", transport: "streamable-http", url: "http://localhost:3000" };
      const result = await upsertServerConfig(stateDir, server);
      expect(result.servers).toHaveLength(1);
      expect(result.servers[0].url).toBe("http://localhost:3000");
    });

    it("replaces existing server with same name", async () => {
      await upsertServerConfig(stateDir, { name: "s1", transport: "stdio", command: "old" });
      await upsertServerConfig(stateDir, { name: "s1", transport: "stdio", command: "new" });
      const config = await readMcpServersConfig(stateDir);
      expect(config.servers).toHaveLength(1);
      expect(config.servers[0].command).toBe("new");
    });
  });

  describe("removeServerConfig", () => {
    it("removes existing server and returns true", async () => {
      await upsertServerConfig(stateDir, { name: "s1", transport: "stdio", command: "echo" });
      const removed = await removeServerConfig(stateDir, "s1");
      expect(removed).toBe(true);
      const config = await readMcpServersConfig(stateDir);
      expect(config.servers).toEqual([]);
    });

    it("returns false when server not found", async () => {
      const removed = await removeServerConfig(stateDir, "nonexistent");
      expect(removed).toBe(false);
    });
  });

  describe("mergeMcpServersConfig", () => {
    it("merges multiple servers, replacing existing", async () => {
      await upsertServerConfig(stateDir, { name: "s1", transport: "stdio", command: "old" });
      const result = await mergeMcpServersConfig(stateDir, [
        { name: "s1", transport: "stdio", command: "updated" },
        { name: "s2", transport: "streamable-http", url: "http://new" },
      ]);
      expect(result.servers).toHaveLength(2);
      expect(result.servers.find((s) => s.name === "s1")?.command).toBe("updated");
      expect(result.servers.find((s) => s.name === "s2")?.url).toBe("http://new");
    });
  });
});
