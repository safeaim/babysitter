import { describe, it, expect, vi } from "vitest";
import { OutboundChannelSender, formatTemplate, DEFAULT_CHANNEL_TOOL_MAPPINGS } from "../outbound";
import type { McpClientManager } from "../../client/manager";
import type { McpToolInfo, McpToolResult } from "../../client/types";

function stubClientManager(
  toolsByServer: Record<string, McpToolInfo[]>,
  callToolResult?: McpToolResult,
): McpClientManager {
  return {
    listTools: vi.fn().mockImplementation((name: string) => {
      const tools = toolsByServer[name];
      if (!tools) throw new Error(`not connected: ${name}`);
      return Promise.resolve(tools);
    }),
    callTool: vi.fn().mockImplementation(() =>
      Promise.resolve(
        callToolResult ?? {
          success: true,
          content: [{ type: "text", text: "msg-123" }],
        },
      ),
    ),
  } as unknown as McpClientManager;
}

describe("GAP-MCPC-002: formatTemplate", () => {
  it("substitutes known variables", () => {
    expect(formatTemplate("Hello {{name}}!", { name: "world" })).toBe("Hello world!");
  });

  it("leaves unknown placeholders intact", () => {
    expect(formatTemplate("{{a}} and {{b}}", { a: "yes" })).toBe("yes and {{b}}");
  });

  it("handles empty template", () => {
    expect(formatTemplate("", { x: "y" })).toBe("");
  });

  it("handles multiple occurrences", () => {
    expect(formatTemplate("{{x}} {{x}}", { x: "hi" })).toBe("hi hi");
  });
});

describe("GAP-MCPC-002: OutboundChannelSender", () => {
  it("sends via slack mapping", async () => {
    const tools: McpToolInfo[] = [
      { name: "slack_send_message", serverName: "slack" },
      { name: "slack_read_channel", serverName: "slack" },
    ];
    const manager = stubClientManager({ slack: tools });
    const sender = new OutboundChannelSender(manager);

    const result = await sender.send({
      channelSource: "slack:C123",
      text: "hello",
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBe("msg-123");
    expect(manager.callTool).toHaveBeenCalledWith("slack", "slack_send_message", {
      channel: "C123",
      text: "hello",
    });
  });

  it("sends with template substitution", async () => {
    const tools: McpToolInfo[] = [{ name: "slack_send_message", serverName: "slack" }];
    const manager = stubClientManager({ slack: tools });
    const sender = new OutboundChannelSender(manager);

    await sender.send({
      channelSource: "slack:C1",
      text: "",
      template: "Alert: {{msg}}",
      templateVars: { msg: "fire" },
    });

    expect(manager.callTool).toHaveBeenCalledWith("slack", "slack_send_message", {
      channel: "C1",
      text: "Alert: fire",
    });
  });

  it("returns error for invalid channel source (no colon)", async () => {
    const manager = stubClientManager({});
    const sender = new OutboundChannelSender(manager);
    const result = await sender.send({ channelSource: "nocolon", text: "hi" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid channel source");
  });

  it("returns error when no tool mapping found", async () => {
    const tools: McpToolInfo[] = [{ name: "read_file", serverName: "files" }];
    const manager = stubClientManager({ files: tools });
    const sender = new OutboundChannelSender(manager);
    const result = await sender.send({ channelSource: "files:x", text: "hi" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("No send-message tool mapping");
  });

  it("returns error when callTool throws", async () => {
    const tools: McpToolInfo[] = [{ name: "slack_send_message", serverName: "slack" }];
    const manager = stubClientManager({ slack: tools });
    (manager.callTool as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network down"));
    const sender = new OutboundChannelSender(manager);
    const result = await sender.send({ channelSource: "slack:C1", text: "hi" });
    expect(result.success).toBe(false);
    expect(result.error).toBe("network down");
  });

  it("uses custom tool mappings", async () => {
    const customMappings = {
      custom: { sendToolName: "my_send", channelArg: "dest", textArg: "body" },
    };
    const tools: McpToolInfo[] = [{ name: "my_send", serverName: "srv" }];
    const manager = stubClientManager({ srv: tools });
    const sender = new OutboundChannelSender(manager, customMappings);
    await sender.send({ channelSource: "srv:room1", text: "test" });
    expect(manager.callTool).toHaveBeenCalledWith("srv", "my_send", {
      dest: "room1",
      body: "test",
    });
  });

  it("returns error result from MCP tool", async () => {
    const tools: McpToolInfo[] = [{ name: "slack_send_message", serverName: "slack" }];
    const failResult: McpToolResult = {
      success: false,
      content: [],
      error: "rate limited",
    };
    const manager = stubClientManager({ slack: tools }, failResult);
    const sender = new OutboundChannelSender(manager);
    const result = await sender.send({ channelSource: "slack:C1", text: "hi" });
    expect(result.success).toBe(false);
    expect(result.error).toBe("rate limited");
  });
});

describe("GAP-MCPC-002: DEFAULT_CHANNEL_TOOL_MAPPINGS", () => {
  it("has slack, discord, email", () => {
    expect(Object.keys(DEFAULT_CHANNEL_TOOL_MAPPINGS)).toEqual(
      expect.arrayContaining(["slack", "discord", "email"]),
    );
  });
});
