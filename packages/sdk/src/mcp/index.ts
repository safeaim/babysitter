export { createBabysitterMcpServer } from "./server";
export { createWebSocketTransport, authenticateUpgrade, WebSocketSessionManager } from "./transport";
export type { WebSocketServerTransport, WebSocketTransportOptions, WebSocketSession } from "./transport";

// MCP Client (GAP-REMOTE-006, GAP-TOOLS-025)
export * as mcpClient from "./client";

// MCP Channels moved to @a5c-ai/babysitter-harness (interactive feature)

/**
 * Start the MCP server on stdio transport.
 * This is the main entry point for running the babysitter MCP server.
 */
export async function startStdioServer(): Promise<void> {
  const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
  const { createBabysitterMcpServer } = await import("./server");
  const server = createBabysitterMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
