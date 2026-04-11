import { describe, it, expect, vi, beforeEach } from "vitest";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  handleMcpConnect,
  handleMcpDisconnect,
  handleMcpStatus,
  handleMcpListTools,
} from "../mcpConnect";

describe("GAP-MCPC-004: handleMcpConnect", () => {
  let stateDir: string;

  beforeEach(async () => {
    stateDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-connect-test-"));
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  it("requires --command for stdio transport", async () => {
    const code = await handleMcpConnect({
      name: "test", transport: "stdio", stateDir, json: false,
    });
    expect(code).toBe(1);
    expect(process.stderr.write).toHaveBeenCalledWith(
      expect.stringContaining("--command is required"),
    );
  });

  it("requires --url for streamable-http transport", async () => {
    const code = await handleMcpConnect({
      name: "test", transport: "streamable-http", stateDir, json: false,
    });
    expect(code).toBe(1);
    expect(process.stderr.write).toHaveBeenCalledWith(
      expect.stringContaining("--url is required"),
    );
  });

  it("adds stdio server successfully", async () => {
    const code = await handleMcpConnect({
      name: "my-server", transport: "stdio", command: "node", args: ["server.js"],
      stateDir, json: false,
    });
    expect(code).toBe(0);
    expect(process.stderr.write).toHaveBeenCalledWith(
      expect.stringContaining('Added server "my-server"'),
    );
  });

  it("outputs JSON when --json", async () => {
    const code = await handleMcpConnect({
      name: "srv", transport: "stdio", command: "cmd", stateDir, json: true,
    });
    expect(code).toBe(0);
    const call = (process.stdout.write as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const parsed = JSON.parse(call);
    expect(parsed.status).toBe("ok");
    expect(parsed.server).toBe("srv");
  });

  it("rejects invalid transport type", async () => {
    const code = await handleMcpConnect({
      name: "srv", transport: "websocket", stateDir, json: false,
    });
    expect(code).toBe(1);
    expect(process.stderr.write).toHaveBeenCalledWith(
      expect.stringContaining('invalid transport "websocket"'),
    );
  });

  it("outputs JSON error for validation failure", async () => {
    const code = await handleMcpConnect({
      name: "srv", transport: "stdio", stateDir, json: true,
    });
    expect(code).toBe(1);
    const calls = (process.stdout.write as ReturnType<typeof vi.fn>).mock.calls;
    const jsonOutput = calls.find((c: unknown[]) => {
      try { const p = JSON.parse(c[0] as string); return p.error != null; } catch { return false; }
    });
    expect(jsonOutput).toBeDefined();
    const parsed = JSON.parse(jsonOutput![0] as string);
    expect(parsed.error).toContain("--command is required");
  });
});

describe("GAP-MCPC-004: handleMcpDisconnect", () => {
  let stateDir: string;

  beforeEach(async () => {
    stateDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-disconnect-test-"));
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  it("returns 1 for non-existent server", async () => {
    const code = await handleMcpDisconnect({ name: "nope", stateDir, json: false });
    expect(code).toBe(1);
  });

  it("removes existing server", async () => {
    await handleMcpConnect({
      name: "srv", transport: "stdio", command: "cmd", stateDir, json: false,
    });
    const code = await handleMcpDisconnect({ name: "srv", stateDir, json: false });
    expect(code).toBe(0);
  });

  it("outputs JSON for removal", async () => {
    await handleMcpConnect({
      name: "srv", transport: "stdio", command: "cmd", stateDir, json: true,
    });
    const code = await handleMcpDisconnect({ name: "srv", stateDir, json: true });
    expect(code).toBe(0);
  });
});

describe("GAP-MCPC-004: handleMcpStatus", () => {
  let stateDir: string;

  beforeEach(async () => {
    stateDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-status-test-"));
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  it("shows no servers when empty", async () => {
    await handleMcpStatus({ stateDir, json: false });
    expect(process.stderr.write).toHaveBeenCalledWith(
      expect.stringContaining("No MCP servers"),
    );
  });

  it("lists configured servers", async () => {
    await handleMcpConnect({
      name: "s1", transport: "stdio", command: "cmd", stateDir, json: false,
    });
    await handleMcpStatus({ stateDir, json: false });
    expect(process.stderr.write).toHaveBeenCalledWith(
      expect.stringContaining("1 server(s)"),
    );
  });

  it("outputs JSON server list", async () => {
    await handleMcpConnect({
      name: "s1", transport: "stdio", command: "cmd", stateDir, json: true,
    });
    await handleMcpStatus({ stateDir, json: true });
    const calls = (process.stdout.write as ReturnType<typeof vi.fn>).mock.calls;
    const lastCall = calls[calls.length - 1][0];
    const parsed = JSON.parse(lastCall);
    expect(parsed.servers).toHaveLength(1);
    expect(parsed.count).toBe(1);
  });
});

describe("GAP-MCPC-004: handleMcpListTools", () => {
  let stateDir: string;

  beforeEach(async () => {
    stateDir = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-tools-test-"));
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  it("reports no servers when empty", async () => {
    const code = await handleMcpListTools({ stateDir, json: false });
    expect(code).toBe(0);
  });

  it("returns 1 for non-existent server filter", async () => {
    const code = await handleMcpListTools({ server: "nope", stateDir, json: false });
    expect(code).toBe(1);
  });

  it("lists servers with note about connection", async () => {
    await handleMcpConnect({
      name: "s1", transport: "stdio", command: "cmd", stateDir, json: false,
    });
    await handleMcpListTools({ stateDir, json: true });
    const calls = (process.stdout.write as ReturnType<typeof vi.fn>).mock.calls;
    const lastCall = calls[calls.length - 1][0];
    const parsed = JSON.parse(lastCall);
    expect(parsed.servers).toHaveLength(1);
    expect(parsed.servers[0].note).toContain("Connect to server");
  });
});
