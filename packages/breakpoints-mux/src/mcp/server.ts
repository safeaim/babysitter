import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import {
  askBreakpointDescription,
  askBreakpointParams,
  handleAskBreakpoint,
} from "./tools/ask-breakpoint.js";
import {
  checkBreakpointStatusDescription,
  checkBreakpointStatusParams,
  handleCheckBreakpointStatus,
} from "./tools/check-status.js";
import {
  listBreakpointsDescription,
  listBreakpointsParams,
  handleListBreakpoints,
} from "./tools/list-breakpoints.js";
import {
  answerBreakpointDescription,
  answerBreakpointParams,
  handleAnswerBreakpoint,
} from "./tools/answer-breakpoint.js";
import {
  verifyBreakpointAnswerDescription,
  verifyBreakpointAnswerParams,
  handleVerifyBreakpointAnswer,
} from "./tools/verify-answer.js";
import { createDefaultBackend } from "../backends/index.js";
import type { BreakpointBackend } from "../backend.js";

/**
 * Resolve the backend for an MCP tool call.
 * Uses the explicit backend param, environment variable, or defaults to git-native.
 */
function resolveToolBackend(params?: {
  backend?: string;
  breakpointsDir?: string;
}): BreakpointBackend {
  return createDefaultBackend(
    params?.breakpointsDir ? { breakpointsDir: params.breakpointsDir } : undefined,
  );
}

/**
 * Create a breakpoints-mux MCP server with all 5 tools registered.
 */
export function createBreakpointMcpServer(): McpServer {
  const server = new McpServer({
    name: "breakpoints-mux",
    version: "0.1.0",
  });

  server.tool(
    "ask_breakpoint",
    askBreakpointDescription,
    askBreakpointParams,
    async (args) => {
      const backend = resolveToolBackend(args);
      const result = await handleAskBreakpoint(args as Parameters<typeof handleAskBreakpoint>[0], backend);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "check_breakpoint_status",
    checkBreakpointStatusDescription,
    checkBreakpointStatusParams,
    async (args) => {
      const backend = resolveToolBackend(args);
      const result = await handleCheckBreakpointStatus(args as Parameters<typeof handleCheckBreakpointStatus>[0], backend);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "list_breakpoints",
    listBreakpointsDescription,
    listBreakpointsParams,
    async (args) => {
      const backend = resolveToolBackend(args);
      const result = await handleListBreakpoints(args as Parameters<typeof handleListBreakpoints>[0], backend);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "answer_breakpoint",
    answerBreakpointDescription,
    answerBreakpointParams,
    async (args) => {
      const backend = resolveToolBackend(args);
      const result = await handleAnswerBreakpoint(args as Parameters<typeof handleAnswerBreakpoint>[0], backend);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    "verify_breakpoint_answer",
    verifyBreakpointAnswerDescription,
    verifyBreakpointAnswerParams,
    async (args) => {
      const backend = resolveToolBackend(args);
      const result = await handleVerifyBreakpointAnswer(args as Parameters<typeof handleVerifyBreakpointAnswer>[0], backend);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  return server;
}

/**
 * Start the breakpoints-mux MCP server on stdio transport.
 */
export async function startBreakpointMcpServer(): Promise<void> {
  const server = createBreakpointMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
