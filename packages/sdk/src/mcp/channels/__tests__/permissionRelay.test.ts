import { describe, it, expect, vi } from "vitest";
import { ChannelPermissionRelay, createApprovalRace } from "../permissionRelay";
import type { OutboundChannelSender } from "../outbound";
import type { ChannelApprovalRequest, ChannelApprovalResponse } from "../types";

function stubSender(): OutboundChannelSender {
  return {
    send: vi.fn().mockResolvedValue({ success: true, messageId: "m1" }),
  } as unknown as OutboundChannelSender;
}

function makeRequest(overrides?: Partial<ChannelApprovalRequest>): ChannelApprovalRequest {
  return {
    requestId: "req-1",
    breakpointId: "confirm.deploy",
    runId: "run-1",
    effectId: "eff-1",
    description: "Deploy to prod?",
    options: ["approve", "reject"],
    createdAt: new Date().toISOString(),
    timeoutMs: 30000,
    ...overrides,
  };
}

describe("GAP-MCPC-003: createApprovalRace", () => {
  it("first claim wins", () => {
    const race = createApprovalRace();
    const c1 = race.claim("channel:slack");
    const c2 = race.claim("local:terminal");
    expect(c1.claimed).toBe(true);
    expect(c1.source).toBe("channel:slack");
    expect(c2.claimed).toBe(false);
  });

  it("getWinner returns the first claimer", () => {
    const race = createApprovalRace();
    expect(race.getWinner()).toBeUndefined();
    race.claim("source-a");
    expect(race.getWinner()?.source).toBe("source-a");
  });

  it("promise resolves with the winner", async () => {
    const race = createApprovalRace();
    race.claim("winner");
    const result = await race.promise;
    expect(result.claimed).toBe(true);
    expect(result.source).toBe("winner");
  });

  it("claim includes response when provided", () => {
    const race = createApprovalRace();
    const response: ChannelApprovalResponse = {
      requestId: "r1",
      approved: true,
      respondedBy: "user1",
      channelSource: "slack:C1",
      respondedAt: new Date().toISOString(),
    };
    const claim = race.claim("channel", response);
    expect(claim.response).toBe(response);
  });
});

describe("GAP-MCPC-003: ChannelPermissionRelay.canRelay", () => {
  it("returns false when security is disabled", () => {
    const relay = new ChannelPermissionRelay({
      sender: stubSender(),
      security: { enabled: false, terminalOnlyTags: [], defaultTimeoutMs: 30000 },
    });
    expect(relay.canRelay("any.breakpoint")).toBe(false);
  });

  it("returns true for normal breakpoints when enabled", () => {
    const relay = new ChannelPermissionRelay({
      sender: stubSender(),
      security: { enabled: true, terminalOnlyTags: ["destroy"], defaultTimeoutMs: 30000 },
    });
    expect(relay.canRelay("confirm.deploy")).toBe(true);
  });

  it("returns false for terminal-only tags", () => {
    const relay = new ChannelPermissionRelay({
      sender: stubSender(),
      security: { enabled: true, terminalOnlyTags: ["destroy", "auth"], defaultTimeoutMs: 30000 },
    });
    expect(relay.canRelay("confirm.deploy", ["destroy"])).toBe(false);
    expect(relay.canRelay("confirm.deploy", ["auth"])).toBe(false);
    expect(relay.canRelay("confirm.deploy", ["safe"])).toBe(true);
  });

  it("blocks breakpoint IDs prefixed with terminal-only tag", () => {
    const relay = new ChannelPermissionRelay({
      sender: stubSender(),
      security: { enabled: true, terminalOnlyTags: ["credential"], defaultTimeoutMs: 30000 },
    });
    expect(relay.canRelay("credential.rotate")).toBe(false);
    expect(relay.canRelay("deploy.staging")).toBe(true);
  });
});

describe("GAP-MCPC-003: ChannelPermissionRelay.relay", () => {
  it("relays to all provided channels", async () => {
    const sender = stubSender();
    const relay = new ChannelPermissionRelay({
      sender,
      security: { enabled: true, terminalOnlyTags: [], defaultTimeoutMs: 30000 },
    });
    const request = makeRequest();
    const result = await relay.relay(request, ["slack:C1", "discord:D1"]);
    expect(result.relayed).toBe(true);
    expect(result.requestId).toBe("req-1");
    expect(sender.send).toHaveBeenCalledTimes(2);
  });

  it("blocks relay for terminal-only breakpoints", async () => {
    const relay = new ChannelPermissionRelay({
      sender: stubSender(),
      security: { enabled: true, terminalOnlyTags: ["destroy"], defaultTimeoutMs: 30000 },
    });
    const request = makeRequest({ breakpointId: "destroy.database" });
    const result = await relay.relay(request, ["slack:C1"], ["destroy"]);
    expect(result.relayed).toBe(false);
    expect(result.reason).toContain("terminal-only");
  });

  it("returns not-relayed when no channels provided", async () => {
    const relay = new ChannelPermissionRelay({
      sender: stubSender(),
      security: { enabled: true, terminalOnlyTags: [], defaultTimeoutMs: 30000 },
    });
    const result = await relay.relay(makeRequest(), []);
    expect(result.relayed).toBe(false);
    expect(result.reason).toContain("No active channels");
  });

  it("tracks pending requests", async () => {
    const relay = new ChannelPermissionRelay({
      sender: stubSender(),
      security: { enabled: true, terminalOnlyTags: [], defaultTimeoutMs: 30000 },
    });
    const request = makeRequest();
    await relay.relay(request, ["slack:C1"]);
    expect(relay.getPendingRequest("req-1")).toBe(request);
    expect(relay.getPendingRequests()).toHaveLength(1);
  });
});

describe("GAP-MCPC-003: ChannelPermissionRelay.handleResponse", () => {
  it("returns and removes pending request", async () => {
    const relay = new ChannelPermissionRelay({
      sender: stubSender(),
      security: { enabled: true, terminalOnlyTags: [], defaultTimeoutMs: 30000 },
    });
    const request = makeRequest();
    await relay.relay(request, ["slack:C1"]);

    const response: ChannelApprovalResponse = {
      requestId: "req-1",
      approved: true,
      respondedBy: "user1",
      channelSource: "slack:C1",
      respondedAt: new Date().toISOString(),
    };

    const matched = relay.handleResponse(response);
    expect(matched).toBe(request);
    expect(relay.getPendingRequest("req-1")).toBeUndefined();
  });

  it("returns undefined for unknown request", () => {
    const relay = new ChannelPermissionRelay({
      sender: stubSender(),
      security: { enabled: true, terminalOnlyTags: [], defaultTimeoutMs: 30000 },
    });
    const response: ChannelApprovalResponse = {
      requestId: "unknown",
      approved: false,
      respondedBy: "u",
      channelSource: "s:c",
      respondedAt: new Date().toISOString(),
    };
    expect(relay.handleResponse(response)).toBeUndefined();
  });
});

describe("GAP-MCPC-003: ChannelPermissionRelay expiry", () => {
  it("handleResponse returns undefined for expired request", async () => {
    const relay = new ChannelPermissionRelay({
      sender: stubSender(),
      security: { enabled: true, terminalOnlyTags: [], defaultTimeoutMs: 30000 },
    });
    // Request with 1ms timeout — will be expired immediately
    const request = makeRequest({ timeoutMs: 1, createdAt: new Date(Date.now() - 100).toISOString() });
    await relay.relay(request, ["slack:C1"]);

    const response: ChannelApprovalResponse = {
      requestId: "req-1",
      approved: true,
      respondedBy: "u",
      channelSource: "slack:C1",
      respondedAt: new Date().toISOString(),
    };
    expect(relay.handleResponse(response)).toBeUndefined();
  });

  it("getPendingRequest returns undefined for expired request", async () => {
    const relay = new ChannelPermissionRelay({
      sender: stubSender(),
      security: { enabled: true, terminalOnlyTags: [], defaultTimeoutMs: 30000 },
    });
    const request = makeRequest({ timeoutMs: 1, createdAt: new Date(Date.now() - 100).toISOString() });
    await relay.relay(request, ["slack:C1"]);
    expect(relay.getPendingRequest("req-1")).toBeUndefined();
  });

  it("getPendingRequests filters expired requests", async () => {
    const relay = new ChannelPermissionRelay({
      sender: stubSender(),
      security: { enabled: true, terminalOnlyTags: [], defaultTimeoutMs: 30000 },
    });
    const expired = makeRequest({ requestId: "exp", timeoutMs: 1, createdAt: new Date(Date.now() - 100).toISOString() });
    const valid = makeRequest({ requestId: "valid", timeoutMs: 999999 });
    await relay.relay(expired, ["slack:C1"]);
    await relay.relay(valid, ["slack:C1"]);
    const pending = relay.getPendingRequests();
    expect(pending).toHaveLength(1);
    expect(pending[0].requestId).toBe("valid");
  });
});

describe("GAP-MCPC-003: ChannelPermissionRelay.security", () => {
  it("uses default security config when not provided", () => {
    const relay = new ChannelPermissionRelay({ sender: stubSender() });
    expect(relay.security.terminalOnlyTags).toContain("destroy");
    expect(relay.security.enabled).toBe(false);
  });
});
