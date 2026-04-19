/**
 * structuredOutputMode.test.ts
 *
 * Tests for structured JSON output mode activation for capable harnesses.
 *
 * Phase 4: Activate structured output mode (Wave 8)
 */

import { describe, it, expect } from "vitest";
import {
  HARNESS_RPC_SUPPORT,
  getHarnessRpcSupport,
} from "../helpers.js";

// ---------------------------------------------------------------------------
// HARNESS_RPC_SUPPORT mapping
// ---------------------------------------------------------------------------

describe("HARNESS_RPC_SUPPORT", () => {
  it("claude-code supports rpc", () => {
    expect(HARNESS_RPC_SUPPORT["claude-code"]).toBe(true);
  });

  it("internal supports rpc", () => {
    expect(HARNESS_RPC_SUPPORT["internal"]).toBe(true);
  });

  it("codex supports rpc", () => {
    expect(HARNESS_RPC_SUPPORT["codex"]).toBe(true);
  });

  it("gemini-cli does not support rpc", () => {
    expect(HARNESS_RPC_SUPPORT["gemini-cli"]).toBeFalsy();
  });

  it("cursor does not support rpc", () => {
    expect(HARNESS_RPC_SUPPORT["cursor"]).toBeFalsy();
  });

  it("github-copilot does not support rpc", () => {
    expect(HARNESS_RPC_SUPPORT["github-copilot"]).toBeFalsy();
  });
});

describe("getHarnessRpcSupport", () => {
  it("returns true for supported harnesses", () => {
    expect(getHarnessRpcSupport("claude-code")).toBe(true);
  });

  it("returns false for unsupported harnesses", () => {
    expect(getHarnessRpcSupport("gemini-cli")).toBe(false);
  });

  it("returns false for unknown harnesses", () => {
    expect(getHarnessRpcSupport("some-unknown")).toBe(false);
  });
});
