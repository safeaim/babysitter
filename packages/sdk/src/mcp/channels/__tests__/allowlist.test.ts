import { describe, it, expect, beforeEach } from "vitest";
import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  readChannelAllowlist,
  writeChannelAllowlist,
  upsertChannel,
  removeChannel,
  toggleChannel,
  getEnabledChannels,
  getChannelAllowlistPath,
} from "../allowlist";
import { CHANNEL_ALLOWLIST_SCHEMA_VERSION } from "../types";
import type { ChannelConfig } from "../types";

describe("GAP-MCPC-001: Channel Allowlist", () => {
  let stateDir: string;

  beforeEach(async () => {
    stateDir = await fs.mkdtemp(path.join(os.tmpdir(), "channel-allowlist-test-"));
  });

  describe("readChannelAllowlist", () => {
    it("returns empty list when file does not exist", async () => {
      const allowlist = await readChannelAllowlist(stateDir);
      expect(allowlist.schemaVersion).toBe(CHANNEL_ALLOWLIST_SCHEMA_VERSION);
      expect(allowlist.channels).toEqual([]);
    });

    it("returns empty list on corrupt JSON", async () => {
      await fs.writeFile(getChannelAllowlistPath(stateDir), "{bad", "utf8");
      const allowlist = await readChannelAllowlist(stateDir);
      expect(allowlist.channels).toEqual([]);
    });

    it("filters out malformed channel entries", async () => {
      const raw = JSON.stringify({
        schemaVersion: "test",
        channels: [
          { serverName: "good", channelId: "C1", displayName: "Good", channelType: "slack", enabled: true },
          { serverName: "bad" }, // missing channelId & enabled
          "not-an-object",
          null,
          { serverName: "also-bad", channelId: "C2" }, // missing enabled
        ],
      });
      await fs.writeFile(getChannelAllowlistPath(stateDir), raw, "utf8");
      const allowlist = await readChannelAllowlist(stateDir);
      expect(allowlist.channels).toHaveLength(1);
      expect(allowlist.channels[0].serverName).toBe("good");
    });

    it("throws on permission errors (non-ENOENT)", async () => {
      // Write a directory where the file should be to trigger EISDIR
      const filePath = getChannelAllowlistPath(stateDir);
      await fs.mkdir(filePath, { recursive: true });
      await expect(readChannelAllowlist(stateDir)).rejects.toThrow();
    });
  });

  describe("writeChannelAllowlist", () => {
    it("persists allowlist to disk", async () => {
      const data = {
        schemaVersion: CHANNEL_ALLOWLIST_SCHEMA_VERSION,
        channels: [{ serverName: "slack", displayName: "Slack", channelId: "C123", channelType: "slack", enabled: true }],
      };
      await writeChannelAllowlist(stateDir, data);
      const raw = await fs.readFile(getChannelAllowlistPath(stateDir), "utf8");
      const parsed = JSON.parse(raw);
      expect(parsed.channels).toHaveLength(1);
    });
  });

  describe("upsertChannel", () => {
    it("adds new channel", async () => {
      const channel: ChannelConfig = { serverName: "slack", displayName: "Slack General", channelId: "C123", channelType: "slack", enabled: true };
      const result = await upsertChannel(stateDir, channel);
      expect(result.channels).toHaveLength(1);
    });

    it("replaces existing channel with same key", async () => {
      await upsertChannel(stateDir, { serverName: "slack", displayName: "Old", channelId: "C123", channelType: "slack", enabled: false });
      await upsertChannel(stateDir, { serverName: "slack", displayName: "New", channelId: "C123", channelType: "slack", enabled: true });
      const allowlist = await readChannelAllowlist(stateDir);
      expect(allowlist.channels).toHaveLength(1);
      expect(allowlist.channels[0].displayName).toBe("New");
      expect(allowlist.channels[0].enabled).toBe(true);
    });
  });

  describe("removeChannel", () => {
    it("removes existing channel", async () => {
      await upsertChannel(stateDir, { serverName: "slack", displayName: "Slack", channelId: "C123", channelType: "slack", enabled: true });
      const removed = await removeChannel(stateDir, "slack", "C123");
      expect(removed).toBe(true);
      const allowlist = await readChannelAllowlist(stateDir);
      expect(allowlist.channels).toEqual([]);
    });

    it("returns false for non-existent channel", async () => {
      const removed = await removeChannel(stateDir, "nope", "C999");
      expect(removed).toBe(false);
    });
  });

  describe("toggleChannel", () => {
    it("toggles enabled state", async () => {
      await upsertChannel(stateDir, { serverName: "slack", displayName: "Slack", channelId: "C123", channelType: "slack", enabled: false });
      const newState = await toggleChannel(stateDir, "slack", "C123");
      expect(newState).toBe(true);
      const again = await toggleChannel(stateDir, "slack", "C123");
      expect(again).toBe(false);
    });

    it("sets explicit enabled state", async () => {
      await upsertChannel(stateDir, { serverName: "slack", displayName: "Slack", channelId: "C123", channelType: "slack", enabled: false });
      const result = await toggleChannel(stateDir, "slack", "C123", true);
      expect(result).toBe(true);
    });

    it("returns undefined for unknown channel", async () => {
      const result = await toggleChannel(stateDir, "nope", "C999");
      expect(result).toBeUndefined();
    });
  });

  describe("getEnabledChannels", () => {
    it("returns only enabled channels", () => {
      const allowlist = {
        schemaVersion: CHANNEL_ALLOWLIST_SCHEMA_VERSION,
        channels: [
          { serverName: "s1", displayName: "A", channelId: "1", channelType: "slack", enabled: true },
          { serverName: "s2", displayName: "B", channelId: "2", channelType: "email", enabled: false },
          { serverName: "s3", displayName: "C", channelId: "3", channelType: "discord", enabled: true },
        ],
      };
      const enabled = getEnabledChannels(allowlist);
      expect(enabled).toHaveLength(2);
      expect(enabled.map((c) => c.serverName)).toEqual(["s1", "s3"]);
    });
  });
});
