import { describe, it, expect, vi, beforeEach } from "vitest";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { ChannelManager } from "../channelManager";
import { upsertChannel } from "../allowlist";
import type { McpClientManager } from "../../client/manager";
import type { McpServerConnection, McpToolInfo } from "../../client/types";

function stubManager(
  connections: McpServerConnection[],
  toolsByServer: Record<string, McpToolInfo[]>,
): McpClientManager {
  return {
    listConnections: () => connections,
    listTools: vi.fn().mockImplementation((name: string) => {
      const tools = toolsByServer[name];
      if (!tools) throw new Error(`not connected: ${name}`);
      return Promise.resolve(tools);
    }),
  } as unknown as McpClientManager;
}

const connected = (name: string): McpServerConnection => ({
  name,
  status: "connected",
  lastStatusChange: new Date().toISOString(),
  reconnectAttempts: 0,
});

const tool = (name: string, server: string): McpToolInfo => ({
  name,
  serverName: server,
});

describe("GAP-MCPC-001: ChannelManager", () => {
  let stateDir: string;

  beforeEach(async () => {
    stateDir = await fs.mkdtemp(path.join(os.tmpdir(), "channel-mgr-test-"));
  });

  describe("detectChannels", () => {
    it("detects Slack channel from tool names", async () => {
      const manager = stubManager(
        [connected("slack-server")],
        { "slack-server": [tool("slack_send_message", "slack-server"), tool("slack_read_channel", "slack-server")] },
      );
      const cm = new ChannelManager({ stateDir, clientManager: manager });
      const detected = await cm.detectChannels();
      expect(detected).toHaveLength(1);
      expect(detected[0].serverName).toBe("slack-server");
      expect(detected[0].capability.outbound).toBe(true);
      expect(detected[0].capability.channelType).toBe("slack");
    });

    it("detects email channel from tool names", async () => {
      const manager = stubManager(
        [connected("gmail")],
        { gmail: [tool("gmail_create_draft", "gmail"), tool("gmail_read_message", "gmail")] },
      );
      const cm = new ChannelManager({ stateDir, clientManager: manager });
      const detected = await cm.detectChannels();
      expect(detected).toHaveLength(1);
      expect(detected[0].capability.channelType).toBe("email");
    });

    it("skips servers without channel tools", async () => {
      const manager = stubManager(
        [connected("regular-server")],
        { "regular-server": [tool("read_file", "regular-server"), tool("write_file", "regular-server")] },
      );
      const cm = new ChannelManager({ stateDir, clientManager: manager });
      const detected = await cm.detectChannels();
      expect(detected).toEqual([]);
    });

    it("does not false-positive on generic tool names containing channel keywords", async () => {
      const manager = stubManager(
        [connected("tools-server")],
        { "tools-server": [tool("cleanup_slack_metadata", "tools-server"), tool("teamspace_list", "tools-server")] },
      );
      const cm = new ChannelManager({ stateDir, clientManager: manager });
      const detected = await cm.detectChannels();
      expect(detected).toEqual([]);
    });

    it("skips disconnected servers", async () => {
      const disconnected: McpServerConnection = {
        name: "offline",
        status: "disconnected",
        lastStatusChange: new Date().toISOString(),
        reconnectAttempts: 0,
      };
      const manager = stubManager([disconnected], {});
      const cm = new ChannelManager({ stateDir, clientManager: manager });
      const detected = await cm.detectChannels();
      expect(detected).toEqual([]);
    });
  });

  describe("message routing", () => {
    it("routes messages to bound runs", () => {
      const manager = stubManager([], {});
      const cm = new ChannelManager({ stateDir, clientManager: manager });
      cm.bindChannelToRun("slack:C123", "run-1");
      cm.processInboundMessage({
        messageId: "m1",
        source: "slack:C123",
        sender: "user",
        content: "hello",
        receivedAt: new Date().toISOString(),
      });
      expect(cm.hasMessages("run-1")).toBe(true);
      const msgs = cm.getMessages("run-1");
      expect(msgs[0].content).toBe("hello");
    });

    it("consumes messages removes them from queue", () => {
      const manager = stubManager([], {});
      const cm = new ChannelManager({ stateDir, clientManager: manager });
      cm.bindChannelToRun("s:c", "r1");
      cm.processInboundMessage({
        messageId: "m1", source: "s:c", sender: "u", content: "a", receivedAt: new Date().toISOString(),
      });
      const consumed = cm.consumeMessages("r1");
      expect(consumed).toHaveLength(1);
      expect(cm.hasMessages("r1")).toBe(false);
    });
  });

  describe("getActiveChannels", () => {
    it("returns enabled channels whose servers are connected", async () => {
      const manager = stubManager([connected("slack")], {});
      const cm = new ChannelManager({ stateDir, clientManager: manager });
      await upsertChannel(stateDir, {
        serverName: "slack", displayName: "Slack", channelId: "C1", channelType: "slack", enabled: true,
      });
      await upsertChannel(stateDir, {
        serverName: "offline", displayName: "Offline", channelId: "C2", channelType: "email", enabled: true,
      });
      const active = await cm.getActiveChannels();
      expect(active).toHaveLength(1);
      expect(active[0].serverName).toBe("slack");
    });
  });
});
