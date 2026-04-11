/**
 * GAP-MCPC-004: mcp:connect command.
 *
 * Add and connect to an MCP server.
 */

import {
  upsertServerConfig,
  readMcpServersConfig,
} from "../../mcp/client/config";
import type { McpServerConfig, McpTransportType } from "../../mcp/client/types";

export interface McpConnectArgs {
  name: string;
  transport: string;
  command?: string;
  args?: string[];
  url?: string;
  autoConnect?: boolean;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  stateDir: string;
  json: boolean;
}

const VALID_TRANSPORTS = new Set<string>(["stdio", "streamable-http"]);

export async function handleMcpConnect(args: McpConnectArgs): Promise<number> {
  if (!VALID_TRANSPORTS.has(args.transport)) {
    const msg = `Error: invalid transport "${args.transport}". Valid transports: ${[...VALID_TRANSPORTS].join(", ")}`;
    if (args.json) {
      process.stdout.write(JSON.stringify({ error: msg }) + "\n");
    } else {
      process.stderr.write(msg + "\n");
    }
    return 1;
  }

  const transport = args.transport as McpTransportType;

  if (transport === "stdio" && !args.command) {
    const msg = "Error: --command is required for stdio transport";
    if (args.json) {
      process.stdout.write(JSON.stringify({ error: msg }) + "\n");
    } else {
      process.stderr.write(msg + "\n");
    }
    return 1;
  }

  if (transport === "streamable-http" && !args.url) {
    const msg = "Error: --url is required for streamable-http transport";
    if (args.json) {
      process.stdout.write(JSON.stringify({ error: msg }) + "\n");
    } else {
      process.stderr.write(msg + "\n");
    }
    return 1;
  }

  const config: McpServerConfig = {
    name: args.name,
    transport,
    command: args.command,
    args: args.args,
    url: args.url,
    autoConnect: args.autoConnect ?? true,
    reconnect: args.reconnect ?? true,
    maxReconnectAttempts: args.maxReconnectAttempts ?? 3,
  };

  const result = await upsertServerConfig(args.stateDir, config);

  if (args.json) {
    process.stdout.write(
      JSON.stringify({
        status: "ok",
        server: config.name,
        transport: config.transport,
        totalServers: result.servers.length,
      }) + "\n",
    );
  } else {
    process.stderr.write(
      `[mcp:connect] Added server "${config.name}" (${config.transport}). ` +
        `Total servers: ${result.servers.length}\n`,
    );
  }

  return 0;
}

export async function handleMcpDisconnect(args: {
  name: string;
  stateDir: string;
  json: boolean;
}): Promise<number> {
  const { removeServerConfig } = await import("../../mcp/client/config");
  const removed = await removeServerConfig(args.stateDir, args.name);

  if (!removed) {
    const msg = `Server "${args.name}" not found in configuration`;
    if (args.json) {
      process.stdout.write(JSON.stringify({ error: msg }) + "\n");
    } else {
      process.stderr.write(`[mcp:disconnect] ${msg}\n`);
    }
    return 1;
  }

  if (args.json) {
    process.stdout.write(JSON.stringify({ status: "ok", server: args.name, removed: true }) + "\n");
  } else {
    process.stderr.write(`[mcp:disconnect] Removed server "${args.name}"\n`);
  }

  return 0;
}

export async function handleMcpStatus(args: {
  stateDir: string;
  json: boolean;
}): Promise<number> {
  const config = await readMcpServersConfig(args.stateDir);
  const servers = config.servers.map((s) => ({
    name: s.name,
    transport: s.transport,
    autoConnect: s.autoConnect ?? false,
    reconnect: s.reconnect ?? false,
  }));

  if (args.json) {
    process.stdout.write(JSON.stringify({ servers, count: servers.length }) + "\n");
  } else {
    if (servers.length === 0) {
      process.stderr.write("[mcp:status] No MCP servers configured\n");
    } else {
      process.stderr.write(`[mcp:status] ${servers.length} server(s) configured:\n`);
      for (const s of servers) {
        process.stderr.write(`  - ${s.name} (${s.transport}) autoConnect=${s.autoConnect}\n`);
      }
    }
  }

  return 0;
}

export async function handleMcpListTools(args: {
  server?: string;
  stateDir: string;
  json: boolean;
}): Promise<number> {
  const config = await readMcpServersConfig(args.stateDir);
  const servers = args.server
    ? config.servers.filter((s) => s.name === args.server)
    : config.servers;

  if (servers.length === 0) {
    const msg = args.server
      ? `Server "${args.server}" not found`
      : "No MCP servers configured";
    if (args.json) {
      process.stdout.write(JSON.stringify({ error: msg }) + "\n");
    } else {
      process.stderr.write(`[mcp:list-tools] ${msg}\n`);
    }
    return args.server ? 1 : 0;
  }

  // TODO: Connect via McpClientManager to list actual tools.
  // Currently shows configured servers with a connection note.
  const result = servers.map((s) => ({
    name: s.name,
    transport: s.transport,
    note: "Connect to server to list available tools",
  }));

  if (args.json) {
    process.stdout.write(JSON.stringify({ servers: result }) + "\n");
  } else {
    for (const s of result) {
      process.stderr.write(`[mcp:list-tools] ${s.name} (${s.transport}): ${s.note}\n`);
    }
  }

  return 0;
}
